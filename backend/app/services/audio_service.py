"""BirdWalk audio handling: validation, safe decode, normalisation.

The Phase 3 smoke test proved the raw analyzer can fail to decode certain
files (stereo 44.1 kHz mp3 -> "Cannot analyze audio file"). Everything
therefore goes through soundfile here: decode -> mono float32 -> a clean
temp WAV at the source rate (the analyzer resamples to 48 kHz itself).
Temp files always live in a caller-managed directory and are cleaned by
the endpoint in a finally block. Nothing is ever persisted by default.
"""
from __future__ import annotations

from pathlib import Path

import soundfile as sf

from ..core.config import MAX_SAMPLE_SECONDS, MAX_UPLOAD_SECONDS


class AudioError(Exception):
    """Raised for unusable audio. `code` maps to an HTTP status."""

    def __init__(self, message: str, code: int = 422):
        super().__init__(message)
        self.code = code


def inspect_audio(path: Path) -> dict:
    """Decode-check a file; return duration/sample_rate/channels/format."""
    try:
        info = sf.info(str(path))
    except Exception:  # noqa: BLE001 - libsndfile raises many types
        raise AudioError(
            "That file could not be decoded as audio. Supported: WAV, OGG, "
            "MP3, FLAC.", 422
        ) from None
    if info.frames == 0:
        raise AudioError("The audio file is empty.", 422)
    return {
        "duration_seconds": round(info.frames / info.samplerate, 3),
        "sample_rate": int(info.samplerate),
        "channels": int(info.channels),
        "format": info.format,
        "subtype": info.subtype,
    }


def validate_duration(meta: dict, *, is_sample: bool) -> None:
    limit = MAX_SAMPLE_SECONDS if is_sample else MAX_UPLOAD_SECONDS
    if meta["duration_seconds"] > limit:
        raise AudioError(
            f"Audio is {meta['duration_seconds']:.0f}s; the limit here is "
            f"{limit:.0f}s. Keep recordings short — a few seconds of nearby "
            "sound is enough.",
            413,
        )


def normalise_to_wav(src: Path, dst_dir: Path) -> Path:
    """Decode with soundfile, downmix to mono float32, write temp WAV.

    Returns the temp WAV path, ready for the analyzer. A silent signal
    raises AudioError — there is nothing for the model to hear.
    """
    try:
        sig, sr = sf.read(str(src), dtype="float32", always_2d=True)
    except Exception:  # noqa: BLE001
        raise AudioError("The audio data looks corrupt or truncated.", 422) from None
    mono = sig.mean(axis=1)
    if float((mono**2).mean()) < 1e-9:
        raise AudioError(
            "The recording is (near) silent. Try again closer to the sound "
            "source, but keep a respectful distance from wildlife.",
            422,
        )
    dst = dst_dir / f"normalised_{src.stem[:40]}.wav"
    sf.write(str(dst), mono, sr, subtype="FLOAT")
    return dst
