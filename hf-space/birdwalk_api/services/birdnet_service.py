"""BirdWalk BirdNET integration.

Only the PUBLIC API of the official package is used:
``from birdnet_analyzer import analyze`` (Phase 2 decision — internal
modules are too fragile across upstream versions). The analyzer writes a
results CSV (``<name>.BirdNET.results.csv``, observed header:
Start (s),End (s),Scientific name,Common name,Confidence,File); we parse
it and aggregate per-species MAX score across segments into top-k
predictions.

Real inference only. This module has no fixture path: if the model or
package is unavailable it raises ModelError and the API returns 503 —
the frontend then shows an honest error state (Phase 5 gate).
"""
from __future__ import annotations

import csv
import io
import os
import shutil
import tempfile
import threading
from pathlib import Path

from ..core.config import MIN_CONFIDENCE, TOP_N

# TF is not re-entrant-friendly for concurrent SavedModel loads on some
# platforms; serialize inference. Requests are short (CPU seconds).
_INFER_LOCK = threading.Lock()


class ModelError(Exception):
    """Model/package unavailable or inference failed."""


def package_available() -> bool:
    """True if the BirdNET-Analyzer package can be IMPORTED.

    This is deliberately weak: importability proves the code is installed,
    NOT that the model weights/labels are present or usable. Never present
    it on its own as model readiness.
    """
    try:
        import birdnet_analyzer  # noqa: F401
    except Exception:  # noqa: BLE001
        return False
    return True


def model_assets_available() -> bool:
    """True if the model weights and label list are actually on disk.

    Checks the paths the official package resolves for this install: the
    species label file plus the TensorFlow SavedModel directory (or the
    TFLite fallback). This is a lightweight filesystem check — it does not
    load TensorFlow or run inference.
    """
    try:
        from birdnet_analyzer import config as bn
    except Exception:  # noqa: BLE001
        return False
    labels = getattr(bn, "BIRDNET_LABELS_FILE", None)
    if not labels or not Path(str(labels)).is_file():
        return False
    saved_model_dir = getattr(bn, "PB_MODEL", None)
    tflite = getattr(bn, "BIRDNET_MODEL_PATH", None)
    sm_ok = bool(saved_model_dir) and (
        Path(str(saved_model_dir), "saved_model.pb").is_file()
    )
    tfl_ok = bool(tflite) and Path(str(tflite)).is_file()
    return sm_ok or tfl_ok


def model_available() -> bool:
    """Overall readiness to run inference: package importable AND assets on
    disk. The old version of this function returned True on a bare
    ``import`` alone, which wrongly implied a usable model — fixed.
    """
    return package_available() and model_assets_available()


def run_inference(wav_path: Path) -> list[dict]:
    """Run official analyze() on a normalised WAV; return raw rows."""
    outdir = Path(tempfile.mkdtemp(prefix="birdwalk_api_"))
    try:
        with _INFER_LOCK:
            try:
                from birdnet_analyzer import analyze
            except Exception as e:  # noqa: BLE001
                raise ModelError(
                    "BirdNET-Analyzer is not installed in the backend "
                    "environment. See README for setup."
                ) from e
            try:
                analyze(
                    str(wav_path),
                    output=str(outdir),
                    min_conf=MIN_CONFIDENCE,
                    top_n=TOP_N,
                    rtype="csv",
                    threads=min(8, os.cpu_count() or 4),
                )
            except Exception as e:  # noqa: BLE001
                raise ModelError(
                    f"Inference failed on this audio: {e.__class__.__name__}"
                ) from e
        results = [p for p in outdir.rglob("*.csv") if "results" in p.name.lower()]
        if not results:
            return []
        rows = list(
            csv.DictReader(io.StringIO(results[0].read_text(encoding="utf-8")))
        )
        return [r for r in rows if r.get("Common name") not in (None, "None", "")]
    finally:
        shutil.rmtree(outdir, ignore_errors=True)


def aggregate(rows: list[dict]) -> list[dict]:
    """Per-species max confidence across segments, ranked, capped at TOP_N.

    Scores are reported verbatim as model_score. No rescaling, no
    smoothing — whatever the model emitted is what the user sees.
    """
    best: dict[str, dict] = {}
    for r in rows:
        try:
            conf = float(r["Confidence"])
        except (KeyError, TypeError, ValueError):
            continue
        common = r["Common name"].strip()
        if not common or common.lower() == "none":
            continue  # defense-in-depth: no-species rows never become predictions
        sci = (r.get("Scientific name") or "").strip() or None
        prev = best.get(common)
        if prev is None or conf > prev["model_score"]:
            best[common] = {
                "species_common_name": common,
                "species_scientific_name": sci,
                "model_score": conf,
            }
    ranked = sorted(best.values(), key=lambda d: d["model_score"], reverse=True)
    return [
        {"rank": i + 1, **d} for i, d in enumerate(ranked[:TOP_N])
    ]
