# BirdWalk — config for the copy that runs on the Hugging Face Space.
#
# This file is a trimmed mirror of backend/app/core/config.py. The path block
# differs on purpose: inside the Space the package sits one directory level
# shallower (space_root/birdwalk_api/core/config.py), and the demo audio is
# shipped in space_root/samples so that a visitor with nothing installed can
# still use the "try a sample" flow.
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # -> the Space repo root
SAMPLE_DIR = ROOT / "samples"
SAMPLE_MANIFEST = SAMPLE_DIR / "manifest.json"
INDIA_SPECIES_FILE = Path(__file__).resolve().parent.parent / "data" / "india_species.json"

# Dev-only origins for CORS. The frontend proxies /api in dev, so this is
# belt-and-braces; no production origins are enabled anywhere.
# A deployed frontend (e.g. Render + Vercel) opts in by listing its origin in
# the BIRDWALK_CORS_ORIGINS env var, comma-separated. The local-first default
# is unchanged: nothing extra is allowed unless that variable is set.
_EXTRA_ORIGINS = [
    o.strip() for o in os.environ.get("BIRDWALK_CORS_ORIGINS", "").split(",") if o.strip()
]
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    *_EXTRA_ORIGINS,
]

# Upload validation limits (ALIGNMENT/SKILLS: reject early, explain clearly)
MAX_UPLOAD_BYTES = 25 * 1024 * 1024          # 25 MB
MAX_UPLOAD_SECONDS = 60.0                    # recording cap is 15 s in UI
MAX_SAMPLE_SECONDS = 300.0                   # whitelisted sample files only

ALLOWED_AUDIO_EXTENSIONS = {".wav", ".ogg", ".mp3", ".flac"}

# Analysis parameters (fixed, documented — not per-user magic)
MIN_CONFIDENCE = 0.15     # rows below this never leave the backend
TOP_N = 3                 # BUILD_PROMPTS: up to three predictions
RELIABLE_SCORE_FLOOR = 0.30  # status 'ok' requires top model_score >= this

MODEL_INFO = {
    "model_name": "BirdNET GLOBAL 6K V2.4",
    "model_version": "2.4",
    "model_source": "Official BirdNET-Analyzer 2.4.0 (PyPI) download mechanism",
    "model_license": "CC BY-NC-SA 4.0 (model weights and data)",
    "code_license": "MIT (BirdNET-Analyzer source code)",
    "attribution": (
        "Powered by BirdNET™. BirdNET is a joint project of the Cornell Lab "
        "of Ornithology and Chemnitz University of Technology."
    ),
    "input_sample_rate": 48000,
    "clip_seconds": 3.0,
    # Authoritative label count: the number of non-empty lines in the
    # EXACT label file shipped with this install
    # (birdnet_analyzer.config.BIRDNET_LABELS_FILE, checkpoints/V2.4/
    # BirdNET_GLOBAL_6K_V2.4_Labels.txt), verified on 2026-10-11. Note the
    # upstream README badge markets "~6,500 / 6K" classes; the concrete V2.4
    # label list distributed in the wheel has 6,522 entries. We publish the
    # measured number, not the badge figure.
    "label_count": 6522,
    # Offline honesty, restated for a HOSTED deployment. On the Space the
    # analysis path still loads a cached local model and issues no per-request
    # call to any third-party inference API, but the visitor's audio crosses
    # the network into Hugging Face infrastructure first, so the local build's
    # "runs on your own machine" framing is not true here and is not claimed.
    "runs_locally_after_setup": True,
    "airplane_mode_verified": False,
    "offline_scope_note": (
        "Hosted demo: analysis runs on the Space's own CPU against a cached "
        "model, with no call to a closed cloud inference API - but recording "
        "or upload sends audio to Hugging Face infrastructure over the "
        "network. This endpoint is NOT offline and NOT on your own machine; "
        "the local build (see the repository) is where that claim applies."
    ),
}
