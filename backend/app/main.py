"""BirdWalk FastAPI service (Phase 4).

Endpoints mirror the locked contract in frontend/src/lib/{types,api}.ts:
  GET  /api/health      -> {status, package_available, model_assets_available,
                            model_ready, model_loaded, last_inference_error}
  GET  /api/model-info  -> ModelInfo
  GET  /api/samples     -> {samples: SampleEntry[]}   (from manifest.json)
  POST /api/analyze     -> AnalyzeResponse  (multipart `file` OR ?sample_id=)
  POST /api/mission     -> MissionResponse  (deterministic templates)

Privacy (ALIGNMENT.md §6): uploads go to a temp dir, are cleaned in
`finally`, never persisted; nothing is forwarded to any third-party
service; we log no audio, no coordinates, no personal data.
"""
from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import (
    ALLOWED_AUDIO_EXTENSIONS,
    ALLOWED_ORIGINS,
    INDIA_SPECIES_FILE,
    MAX_UPLOAD_BYTES,
    MODEL_INFO,
    RELIABLE_SCORE_FLOOR,
    SAMPLE_DIR,
    SAMPLE_MANIFEST,
)
from .schemas import (
    AnalyzeResponse,
    AudioMeta,
    Mission,
    MissionRequest,
    MissionResponse,
    ModelInfo,
    Prediction,
    SampleEntry,
    SamplesResponse,
)
from .services import birdnet_service
from .services.audio_service import AudioError, inspect_audio, normalise_to_wav, validate_duration
from .services.mission_service import build_mission

app = FastAPI(title="BirdWalk API", version="0.1.0", docs_url=None, redoc_url=None)

# Dev-origin CORS only; there is no production deployment to whitelist.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

_state = {"model_ever_loaded": False, "last_inference_error": None}


def _readiness() -> dict:
    """Lightweight, honest readiness breakdown.

    Distinguishes: package importable, model assets on disk, and whether
    a real inference has ever succeeded (tracked separately as
    `model_loaded`). No TensorFlow load or inference happens here.
    """
    pkg = birdnet_service.package_available()
    assets = birdnet_service.model_assets_available()
    return {
        "package_available": pkg,
        "model_assets_available": assets,
        # `model_ready` now means package AND usable weights, not merely
        # that `import birdnet_analyzer` succeeds.
        "model_ready": bool(pkg and assets),
    }


def _load_manifest() -> list[dict]:
    if not SAMPLE_MANIFEST.exists():
        return []
    try:
        data = json.loads(SAMPLE_MANIFEST.read_text(encoding="utf-8"))
        return data.get("samples", [])
    except (json.JSONDecodeError, OSError):
        return []


def _analyze_path(src: Path, source_label: str | None, is_sample: bool) -> AnalyzeResponse:
    """Shared pipeline: validate -> normalise -> real inference -> schema."""
    meta = inspect_audio(src)
    validate_duration(meta, is_sample=is_sample)
    tmpdir = Path(tempfile.mkdtemp(prefix="birdwalk_"))
    try:
        wav = normalise_to_wav(src, tmpdir)
        rows = birdnet_service.run_inference(wav)
        _state["model_ever_loaded"] = True
        _state["last_inference_error"] = None
        preds = birdnet_service.aggregate(rows)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    top = preds[0]["model_score"] if preds else 0.0
    status = "ok" if preds and top >= RELIABLE_SCORE_FLOOR else "no_reliable_detection"
    if status == "ok":
        note = (
            "Model scores from BirdNET GLOBAL 6K V2.4 — not accuracy. "
            "Overlapping calls, distance, wind and recording quality "
            "affect results. Treat the top entry as a possible match."
        )
    elif preds:
        note = (
            f"The strongest model score was {top:.2f}, below the "
            "0.30 reliability floor — no reliable detection. This is an "
            "honest 'not sure', not a hidden guess."
        )
    else:
        note = (
            "No species candidate reached the minimum model score of 0.15. "
            "The clip may be too quiet, too noisy, or contain no bird."
        )
    return AnalyzeResponse(
        status=status,
        predictions=[Prediction(**p) for p in preds],
        audio=AudioMeta(
            duration_seconds=meta["duration_seconds"],
            sample_rate=meta["sample_rate"],
            channels=meta["channels"],
        ),
        model=ModelInfo(**MODEL_INFO),
        note=note,
        is_demo_fixture=False,
        source_label=source_label,
    )


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        **_readiness(),
        "model_loaded": _state["model_ever_loaded"],
        "last_inference_error": _state["last_inference_error"],
    }


@app.get("/api/model-info", response_model=ModelInfo)
def model_info() -> ModelInfo:
    return ModelInfo(**MODEL_INFO)


@app.get("/api/samples", response_model=SamplesResponse)
def samples() -> SamplesResponse:
    out: list[SampleEntry] = []
    for e in _load_manifest():
        # Only offer samples whose audio actually exists on this machine
        # (files are gitignored; the download script reproduces them).
        if not (SAMPLE_DIR / str(e.get("file", ""))).is_file():
            continue
        try:
            out.append(SampleEntry(**{k: v for k, v in e.items() if k in SampleEntry.model_fields}))
        except Exception:  # noqa: BLE001 - malformed manifest entry
            continue
    return SamplesResponse(samples=out)


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(
    file: UploadFile | None = File(default=None),
    source_label: str | None = Form(default=None),
    sample_id: str | None = Query(default=None),
):
    tmpdir = Path(tempfile.mkdtemp(prefix="birdwalk_up_"))
    try:
        if sample_id:
            # Whitelisted sample route: id must exist in the manifest and
            # the file must sit inside SAMPLE_DIR (no path traversal).
            entry = next((e for e in _load_manifest() if e.get("id") == sample_id), None)
            if entry is None:
                return JSONResponse({"detail": "Unknown sample_id."}, status_code=404)
            src = (SAMPLE_DIR / str(entry["file"])).resolve()
            if not str(src).startswith(str(SAMPLE_DIR.resolve())) or not src.is_file():
                return JSONResponse({"detail": "Sample file not available."}, status_code=404)
            return _analyze_path(src, entry.get("species_label"), is_sample=True)

        if file is None:
            return JSONResponse(
                {"detail": "Provide an audio file (multipart 'file') or a sample_id."},
                status_code=400,
            )
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            return JSONResponse(
                {"detail": f"Unsupported file type '{ext or 'unknown'}'. "
                            "Use WAV, OGG, MP3 or FLAC."},
                status_code=415,
            )
        dest = tmpdir / f"upload{ext}"
        size = 0
        with dest.open("wb") as f:
            while chunk := file.file.read(65536):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    return JSONResponse(
                        {"detail": "File exceeds the 25 MB limit."}, status_code=413
                    )
                f.write(chunk)
        if size == 0:
            return JSONResponse({"detail": "Empty upload."}, status_code=422)
        try:
            return _analyze_path(dest, source_label, is_sample=False)
        except AudioError as e:
            return JSONResponse({"detail": str(e)}, status_code=e.code)
    except birdnet_service.ModelError as e:
        _state["last_inference_error"] = str(e)
        code = 503 if "not installed" in str(e) else 500
        return JSONResponse({"detail": str(e)}, status_code=code)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


@app.get("/api/india-species")
def india_species(q: str | None = Query(default=None, max_length=60)) -> dict:
    """Phase 8: India-relevant shortlist whose names were verified to
    exist in the BirdNET V2.4 label set (label-presence only — no
    regional-accuracy claim, no GPS). Searchable, returns <=50."""
    if not INDIA_SPECIES_FILE.exists():
        return {
            "available": False,
            "note": "Shortlist not generated yet — run scripts/build_india_species_list.py.",
            "species": [],
        }
    data = json.loads(INDIA_SPECIES_FILE.read_text(encoding="utf-8"))
    species = data["species"]
    if q:
        needle = q.lower().strip()
        species = [
            s for s in species
            if needle in s["species_common_name"].lower()
            or needle in s["species_scientific_name"].lower()
        ]
    return {
        "available": True,
        "disclaimer": data["disclaimer"],
        "total_verified": data["verified_count"],
        "species": species[:50],
    }


@app.post("/api/mission", response_model=MissionResponse)
def mission(req: MissionRequest) -> MissionResponse:
    return MissionResponse(mission=build_mission(req), generated_by="deterministic_template")


@app.exception_handler(AudioError)
def _audio_error_handler(_: object, exc: AudioError) -> JSONResponse:
    return JSONResponse({"detail": str(exc)}, status_code=exc.code)
