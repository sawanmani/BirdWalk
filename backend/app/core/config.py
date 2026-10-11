# BirdWalk — local config (paths, limits, dev origins).
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # backend/app/core/config.py -> repo root
SAMPLE_DIR = ROOT / "data" / "samples"
SAMPLE_MANIFEST = SAMPLE_DIR / "manifest.json"
INDIA_SPECIES_FILE = Path(__file__).resolve().parent.parent / "data" / "india_species.json"

# Dev-only origins for CORS. The frontend proxies /api in dev, so this is
# belt-and-braces; no production origins are enabled anywhere.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
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
    "label_count": 6522,  # observed at load time on this machine
    # Honest flag: the app runs inference from the locally cached model,
    # but a full airplane-mode end-to-end test has NOT been performed yet.
    "offline_after_download": True,
}
