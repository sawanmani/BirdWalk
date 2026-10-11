"""BirdWalk — Phase 2 model spike (REAL inference, no fixtures).

Verifies that the official BirdNET-Analyzer package can:
  1. download/load the pretrained V2.4 model on this machine,
  2. run genuine inference on an audio file,
  3. return actual predictions we can parse.

Two audio inputs:
  * a generated 3-second sine tone  -> execution check only (NOT a species test)
  * any real bird clip in data/samples (if present) -> smoke test (Phase 3)

Run:
    backend\\.venv\\Scripts\\python.exe scripts\\smoke_test_model.py

Results printed here are actual model outputs, recorded verbatim into
TEST_REPORT.md / IMPLEMENTATION_STATUS.md. No number in this script is
invented.
"""

from __future__ import annotations

import csv
import io
import os
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE_DIR = ROOT / "data" / "samples"

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")


def write_tone_wav(path: Path, seconds: float = 3.0, sr: int = 48000, freq: float = 440.0) -> None:
    """Generate a deterministic sine tone WAV (execution check, not audio content)."""
    import numpy as np
    import soundfile as sf

    t = np.linspace(0, seconds, int(sr * seconds), endpoint=False)
    sig = (0.2 * np.sin(2 * np.pi * freq * t)).astype("float32")
    sf.write(path, sig, sr, subtype="FLOAT")


def run_analyze(audio_path: Path, label: str) -> None:
    from birdnet_analyzer import analyze

    outdir = Path(tempfile.mkdtemp(prefix="birdwalk_smoke_"))
    print(f"\n=== {label} :: {audio_path.name} ===")
    try:
        analyze(
            str(audio_path),
            output=str(outdir),
            min_conf=0.05,
            top_n=3,
            rtype="csv",
            threads=min(8, os.cpu_count() or 4),
        )
        # The analyzer writes a settings file (BirdNET_analysis_params.csv)
        # plus one results CSV per audio file: "<name>.BirdNET.results.csv"
        # with header Start (s),End (s),Scientific name,Common name,Confidence,File.
        csvs = [p for p in outdir.rglob("*.csv") if "results" in p.name.lower()]
        if not csvs:
            print("NO RESULTS CSV PRODUCED")
            return
        rows = list(csv.DictReader(io.StringIO(csvs[0].read_text(encoding="utf-8"))))
        rows = [r for r in rows if r.get("Common name") and r["Common name"] != "None"]
        if not rows:
            print("  0 species detections above min_conf 0.05 (honest negative result)")
            return
        for r in rows[:8]:
            print(
                f"  {r['Start (s)']}-{r['End (s)']}s  "
                f"{r['Common name']} [{r['Scientific name']}]  conf={r['Confidence']}"
            )
    finally:
        shutil.rmtree(outdir, ignore_errors=True)


def main() -> int:
    print("Python:", sys.version)
    import birdnet_analyzer

    print("birdnet_analyzer version:", birdnet_analyzer.__version__)

    # Ensure model assets exist (downloads via the official mechanism on first run)
    from birdnet_analyzer.utils import ensure_model_exists  # triggers download if absent

    tmp = Path(tempfile.mkdtemp(prefix="birdwalk_tone_"))
    try:
        tone = tmp / "generated_tone_3s.wav"
        write_tone_wav(tone)
        print(f"Generated execution-check tone: {tone} ({tone.stat().st_size} bytes)")
        run_analyze(tone, "EXECUTION CHECK (sine tone — not a species test)")

        reals = []
        if SAMPLE_DIR.exists():
            for ext in (".wav", ".ogg", ".mp3", ".flac"):
                reals.extend(sorted(SAMPLE_DIR.glob(f"*{ext}")))
        if reals:
            for real in reals:
                run_analyze(real, "REAL SAMPLE SMOKE TEST (source label = claim only)")
        else:
            print("\nNo real samples on disk yet (Phase 3 provides them).")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
