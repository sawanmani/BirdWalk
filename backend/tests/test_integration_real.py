"""Phase 4 gate test: REAL end-to-end inference through the API.

Skipped automatically when the model package or sample audio is absent
(the honest state, not a silent pass). Run with:

    backend\\.venv\\Scripts\\python.exe -m pytest tests -m integration -v
"""
from __future__ import annotations

import json

import pytest

from app.core.config import SAMPLE_MANIFEST
from app.services.birdnet_service import model_available

pytestmark = pytest.mark.integration


def _first_usable_sample_id() -> str | None:
    if not SAMPLE_MANIFEST.exists():
        return None
    data = json.loads(SAMPLE_MANIFEST.read_text(encoding="utf-8"))
    for e in data.get("samples", []):
        # The stereo XC-mirror mp3 previously broke the raw analyzer;
        # the backend pipeline must now handle it. Prefer short clips.
        dur = e.get("audio_checks", {}).get("duration_seconds", 999)
        if dur <= 30:
            return e["id"]
    return None


@pytest.mark.skipif(not model_available(), reason="birdnet-analyzer not installed")
def test_real_inference_via_sample_endpoint(client):
    sid = _first_usable_sample_id()
    if sid is None:
        pytest.skip("no sample audio on disk — run scripts/download_samples.py")
    r = client.post("/api/analyze", params={"sample_id": sid})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_demo_fixture"] is False
    assert body["status"] in ("ok", "no_reliable_detection")
    assert body["source_label"], "sample analyses must carry the source claim"

    def _keys(obj, prefix=""):
        found = []
        if isinstance(obj, dict):
            for k, v in obj.items():
                found.append(prefix + k)
                found += _keys(v, prefix + k + ".")
        elif isinstance(obj, list):
            for item in obj:
                found += _keys(item, prefix)
        return found

    # No field may be named accuracy/probability (ALIGNMENT.md §3/§4);
    # prose disclaimers like "not accuracy" are explicitly allowed.
    assert not any("accuracy" in k.lower() or "probability" in k.lower()
                   for k in _keys(body))
    for p in body["predictions"]:
        assert 0.0 <= p["model_score"] <= 1.0
        assert p["rank"] >= 1
    # Actual output observed 2026-10-11 for the Asian Koel ogg sample:
    # rank 1 = 'Asian Koel' with model_score ~0.97 — see TEST_REPORT.md.


@pytest.mark.skipif(not model_available(), reason="birdnet-analyzer not installed")
def test_real_inference_via_upload(client):
    """Upload STEREO audio — the raw analyzer failed on the 129 s stereo
    XC-mirror mp3 in Phase 3; the backend normalisation path must handle
    it. We take a 20 s stereo slice to stay under the 60 s upload cap."""
    import io

    import soundfile as sf

    from app.core.config import SAMPLE_DIR

    if not SAMPLE_MANIFEST.exists():
        pytest.skip("no sample audio on disk")
    data = json.loads(SAMPLE_MANIFEST.read_text(encoding="utf-8"))
    stereo = next(
        (e for e in data["samples"]
         if e.get("audio_checks", {}).get("channels") == 2),
        None,
    )
    if stereo is None:
        pytest.skip("no stereo sample on disk")
    sig, sr = sf.read(str(SAMPLE_DIR / stereo["file"]), dtype="float32")
    assert sig.ndim == 2 and sig.shape[1] == 2
    slice20 = sig[: 20 * sr]
    buf = io.BytesIO()
    sf.write(buf, slice20, sr, format="WAV", subtype="FLOAT")
    buf.seek(0)
    r = client.post(
        "/api/analyze",
        files={"file": ("stereo_slice.wav", buf, "audio/wav")},
        data={"source_label": stereo["species_label"]},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["audio"]["channels"] == 2  # reported from the original upload
    assert body["is_demo_fixture"] is False


def test_mission_endpoint_contract(client):
    r = client.post(
        "/api/mission",
        json={"top_species": "Asian Koel", "model_score": 0.93, "uncertain": False},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["generated_by"] == "deterministic_template"
    m = body["mission"]
    assert {"id", "category", "title", "instruction", "duration_seconds",
            "accessibility_note", "works_when_uncertain"} == set(m)

    r2 = client.post("/api/mission", json={"uncertain": True})
    assert r2.json()["mission"]["works_when_uncertain"] is True

    r3 = client.post(
        "/api/mission",
        json={"top_species": "Asian Koel", "model_score": 0.93, "uncertain": False},
    )
    assert r3.json() == body  # deterministic
