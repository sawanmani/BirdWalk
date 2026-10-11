"""Record REAL top-k model outputs for each bundled sample.

Pre-submission audit P1.6. This runs the *production* analysis path
(`backend.app.main._analyze_path`: validate -> normalise -> official
BirdNET `analyze()` -> per-species max aggregation) on every sample in
`data/samples/manifest.json` and writes `data/model_outputs.json`.

Honesty rules baked in:
  * Uploader species labels are UNVERIFIED source claims, not ground truth.
  * "source_label_agreement" means the top model prediction shares the
    common name the uploader claimed. It is NOT an accuracy measurement.
  * Five curated clips = a small metadata-based smoke test, NOT a field
    test and NOT a model-accuracy benchmark.
Nothing here edits a prediction to manufacture a match; scores are written
verbatim as emitted by the model.

Run:  backend\\.venv\\Scripts\\python.exe scripts\\record_sample_outputs.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "backend"))

# Import the real pipeline (no fixture, no shortcut).
from app.main import _analyze_path  # noqa: E402
from app.core.config import SAMPLE_DIR, SAMPLE_MANIFEST  # noqa: E402
from app.services import birdnet_service  # noqa: E402
from app.services.audio_service import AudioError  # noqa: E402

OUT = REPO / "data" / "model_outputs.json"


def _base_species_label(claim: str | None) -> str:
    """Strip the '(source claim)' marker for a rough name comparison."""
    if not claim:
        return ""
    return claim.replace("(source claim)", "").strip().lower()


def record_one(entry: dict) -> dict:
    fname = entry.get("file")
    src = (SAMPLE_DIR / str(fname)).resolve()
    claim = entry.get("species_label")
    result: dict = {
        "sample_id": entry.get("id"),
        "file": fname,
        "source_label_claim": claim,
        "source_label_independently_verified": entry.get(
            "label_independently_verified", False
        ),
        "creator": entry.get("creator"),
        "license": entry.get("license"),
        "checksum_sha256": entry.get("checksum_sha256"),
        "duration_seconds": (entry.get("audio_checks") or {}).get("duration_seconds"),
    }
    if not src.is_file():
        result["error"] = "sample file not present on disk (run download_samples.py)"
        result["predictions"] = []
        result["source_label_agreement"] = None
        return result

    try:
        resp = _analyze_path(src, claim, is_sample=True)
        result["status"] = resp.status
        result["audio_duration_seconds"] = resp.audio.duration_seconds
        result["predictions"] = [
            {
                "rank": p.rank,
                "species_common_name": p.species_common_name,
                "species_scientific_name": p.species_scientific_name,
                "model_score": p.model_score,
            }
            for p in resp.predictions
        ]
        top = resp.predictions[0].species_common_name.lower() if resp.predictions else ""
        base = _base_species_label(claim)
        # agreement = top prediction common name equals the uploader's claim
        result["source_label_agreement"] = bool(top) and (top == base)
    except (AudioError, birdnet_service.ModelError) as exc:
        # Record the failure honestly; do NOT substitute a friendly result.
        result["error"] = f"{exc.__class__.__name__}: {exc}"
        result["predictions"] = []
        result["source_label_agreement"] = None
    return result


def main() -> int:
    if not SAMPLE_MANIFEST.exists():
        print(f"ERROR: manifest not found at {SAMPLE_MANIFEST}", file=sys.stderr)
        return 1
    manifest = json.loads(SAMPLE_MANIFEST.read_text(encoding="utf-8"))
    samples = manifest.get("samples", [])

    results = [record_one(e) for e in samples]
    agreements = sum(1 for r in results if r.get("source_label_agreement") is True)
    errors = [r["sample_id"] for r in results if r.get("error")]

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pipeline": "backend.app.main._analyze_path (validate -> normalise -> "
        "official BirdNET analyze() -> per-species max aggregation)",
        "model": "BirdNET GLOBAL 6K V2.4",
        "honesty": {
            "what_this_is": "Real top-k model outputs on 5 curated, licence-"
            "filtered clips. A small metadata-based SMOKE TEST of the pipeline.",
            "what_this_is_not": "NOT a field test, NOT a model-accuracy "
            "benchmark, and NOT a claim of general recogniser performance.",
            "source_labels": "Uploader labels on Wikimedia Commons are "
            "unverified source claims, not ground truth.",
            "agreement_vs_accuracy": "'source_label_agreement' = the top "
            "prediction shares the uploader's claimed common name. That is "
            "label AGREEMENT, not independently verified ACCURACY.",
        },
        "summary": {
            "clips": len(results),
            "source_label_agreements": agreements,
            "analysis_errors": errors,
        },
        "results": results,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT}")
    print(
        f"Clips={len(results)} agreements={agreements} "
        f"errors={len(errors)} {errors if errors else ''}"
    )
    for r in results:
        top = (r.get("predictions") or [{}])[0] if r.get("predictions") else {}
        print(
            f"  - {r['sample_id']}: status={r.get('status', 'ERR')} "
            f"top={top.get('species_common_name', '-')}"
            f" ({top.get('model_score', '-')}) "
            f"agreement={r.get('source_label_agreement')}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
