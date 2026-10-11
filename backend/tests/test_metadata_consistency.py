"""Metadata-consistency checks for the pre-submission audit (P1.7).

These are fast UNIT tests: they read only committed JSON/markdown files,
never the gitignored audio and never TensorFlow. They lock in the factual
corrections made during the audit so a regression cannot silently return:

  * Red-whiskered Bulbul taxonomy is Pycnonotus jocosus, never cafer.
  * Uploader labels are always flagged as unverified source claims.
  * data/model_outputs.json is internally honest (model_score, not
    accuracy; agreement count matches; checksums match the manifest).
  * The authoritative label count (6,522) is consistent across the API
    config and the model card.
"""
from __future__ import annotations

import json

from app.core.config import MODEL_INFO, ROOT, SAMPLE_MANIFEST

MODEL_OUTPUTS = ROOT / "data" / "model_outputs.json"
MODEL_CARD = ROOT / "MODEL_CARD.md"


def _manifest_samples() -> list[dict]:
    data = json.loads(SAMPLE_MANIFEST.read_text(encoding="utf-8"))
    return data.get("samples", [])


def test_red_whiskered_bulbul_is_jocosus_not_cafer() -> None:
    samples = _manifest_samples()
    assert samples, "manifest should list samples"
    for s in samples:
        claim = (s.get("species_label") or "").lower()
        sci = (s.get("scientific_name") or "").strip()
        if "red-whiskered" in claim:
            # Pycnonotus cafer is the Red-VENTED bulbul, a different species.
            assert sci == "Pycnonotus jocosus", (
                f"{s.get('id')}: Red-whiskered Bulbul must be Pycnonotus "
                f"jocosus, got {sci!r}"
            )
            assert sci != "Pycnonotus cafer"


def test_uploader_labels_flagged_as_unverified_claims() -> None:
    for s in _manifest_samples():
        assert s.get("label_independently_verified") is False, s.get("id")
        assert "(source claim)" in (s.get("species_label") or ""), s.get("id")


def test_model_outputs_artifact_is_honest() -> None:
    assert MODEL_OUTPUTS.is_file(), (
        "run scripts/record_sample_outputs.py to generate "
        "data/model_outputs.json"
    )
    data = json.loads(MODEL_OUTPUTS.read_text(encoding="utf-8"))
    assert "honesty" in data and "what_this_is_not" in data["honesty"]
    results = data["results"]
    assert len(results) == len(_manifest_samples())

    recomputed = 0
    for r in results:
        # Every clip must carry the unverified-claim flag.
        assert r.get("source_label_independently_verified") is False, r["sample_id"]
        agreement = r.get("source_label_agreement")
        assert agreement in (True, False, None), r["sample_id"]
        if agreement is True:
            recomputed += 1
        # Scores are model_score only — never an 'accuracy' field.
        for p in r.get("predictions", []):
            assert "model_score" in p
            assert "accuracy" not in p
    assert data["summary"]["source_label_agreements"] == recomputed


def test_model_outputs_checksums_match_manifest() -> None:
    if not MODEL_OUTPUTS.is_file():
        raise AssertionError("data/model_outputs.json missing")
    by_id = {s["id"]: s for s in _manifest_samples()}
    for r in json.loads(MODEL_OUTPUTS.read_text(encoding="utf-8"))["results"]:
        src = by_id.get(r["sample_id"])
        assert src is not None, f"unknown sample in outputs: {r['sample_id']}"
        assert r["checksum_sha256"] == src["checksum_sha256"], r["sample_id"]


def test_authoritative_label_count_is_consistent() -> None:
    assert MODEL_INFO["label_count"] == 6522
    if MODEL_CARD.is_file():
        text = MODEL_CARD.read_text(encoding="utf-8")
        assert "6,522" in text, "MODEL_CARD must publish the authoritative count"
