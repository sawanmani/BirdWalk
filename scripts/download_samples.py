"""BirdWalk — Phase 3 sample acquisition (Wikimedia Commons API).

Downloads a small set of bird recordings for LOCAL pipeline smoke tests.

Source choice: the builder cannot record personally today. Xeno-canto was
attempted first but its public API returned 404 in this environment;
Wikimedia Commons is the second source explicitly approved by
CONTEXT.md §9 / BUILD_PROMPTS.md §6. Commons also mirrors many Xeno-canto
recordings with their original attribution, which we preserve verbatim.

Rules honoured (SKILLS.md Skill 6):
  * Uses the official MediaWiki API (action=query). No scraping, no
    anti-bot bypass, sequential requests with delays.
  * Per-file licence is read from extmetadata; only free licences
    (CC BY / CC BY-SA / CC0 / PD; NC variants allowed because this demo
    is strictly non-commercial) are accepted, and every value is stored.
  * Audio files land in data/samples/ (gitignored) — NOT redistributed in
    the repository. This script reproduces them on demand.
  * Every entry records: title, source page, direct URL, artist, licence,
    retrieval date, checksum, decoded duration/samplerate/channels.
  * Commons species labels are uploader-provided identifications — a
    metadata smoke test, not independent ground truth, not a field test.

Run:
    backend\\.venv\\Scripts\\python.exe scripts\\download_samples.py
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
SAMPLE_DIR = ROOT / "data" / "samples"
MANIFEST = SAMPLE_DIR / "manifest.json"

API = "https://commons.wikimedia.org/w/api.php"
# Wikimedia policy: distinctive UA with tool info and a contact address.
UA = {
    "User-Agent": (
        "BirdWalkDemo/1.0 (https://github.com/birdwalk/birdwalk; "
        "non-commercial Hacktoberfest educational demo; contact: "
        "birdwalk.demo@proton.me) python-requests"
    )
}

# (display label, scientific name, Commons search query)
TARGETS = [
    ("Indian Robin", "Copsychus fulicatus", '"Indian robin" call filetype:audio'),
    ("Red-whiskered Bulbul", "Pycnonotus cafer", '"Red-whiskered bulbul" call filetype:audio'),
    ("Asian Koel", "Eudynamys scolopaceus", '"Asian koel" call filetype:audio'),
]

AUDIO_EXTS = (".wav", ".ogg", ".mp3", ".flac")
MAX_BYTES = 25 * 1024 * 1024
REQ_DELAY_S = 2.0

LICENSE_ALLOWED = re.compile(
    r"^(cc[ -]?by|cc[ -]?0|public domain|pd|cc some rights reserved"
    r"|gfdl|attribution|mit bsd)",
    re.IGNORECASE,
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).strip()


def api_get(params: dict) -> dict:
    r = requests.get(API, params={**params, "format": "json"}, headers=UA, timeout=30)
    r.raise_for_status()
    return r.json()


def find_files(query: str, limit: int = 6) -> list[str]:
    data = api_get(
        {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srnamespace": "6",
            "srlimit": str(limit),
        }
    )
    hits = [t["title"] for t in data.get("query", {}).get("search", [])]
    return [h for h in hits if h.lower().endswith(AUDIO_EXTS)]


def file_info(title: str) -> dict | None:
    data = api_get(
        {
            "action": "query",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata",
        }
    )
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        ii = page.get("imageinfo")
        if not ii:
            continue
        em = ii[0].get("extmetadata", {})

        def meta(key: str, default: str = "") -> str:
            return strip_html(em.get(key, {}).get("value", default))

        return {
            "title": title,
            "url": ii[0].get("url"),
            "description_url": ii[0].get("descriptionurl"),
            "size": ii[0].get("size", 0),
            "mime": ii[0].get("mime", ""),
            "artist": meta("Artist", "unknown"),
            "license": meta("LicenseShortName", meta("UsageTerms", "unknown")),
            "attribution": meta("Attribution", ""),
            "credits": meta("ImageDescription", ""),
        }
    return None


def verify_audio(path: Path) -> dict:
    info = sf.info(str(path))
    sig, sr = sf.read(str(path), dtype="float32")
    rms = float((sig**2).mean() ** 0.5)
    if info.frames == 0 or rms <= 1e-7:
        raise ValueError("audio decodes but is empty/silent")
    return {
        "duration_seconds": round(info.frames / info.samplerate, 3),
        "sample_rate": int(info.samplerate),
        "channels": int(info.channels),
        "format": info.format,
        "subtype": info.subtype,
        "rms": round(rms, 6),
    }


def download(url: str, path: Path, referer: str) -> None:
    # Strip ?utm_* tracking params the API adds; they are not needed
    # for the raw file fetch.
    clean = url.split("?")[0]
    headers = {**UA, "Referer": referer}
    for attempt in range(3):
        r = requests.get(clean, headers=headers, timeout=90, stream=True)
        if r.status_code == 429:
            wait = 8 * (attempt + 1)
            print(f"    429 throttled, backing off {wait}s")
            time.sleep(wait)
            continue
        r.raise_for_status()
        size = 0
        with path.open("wb") as f:
            for chunk in r.iter_content(65536):
                size += len(chunk)
                if size > MAX_BYTES:
                    raise ValueError("file exceeds size cap")
                f.write(chunk)
        return
    raise ValueError("gave up after repeated 429 responses")


def main() -> int:
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    entries: list[dict] = []

    for label, sci, query in TARGETS:
        print(f"Commons search: {label} ({sci})")
        time.sleep(REQ_DELAY_S)
        try:
            titles = find_files(query)
        except Exception as e:  # noqa: BLE001
            print(f"  search failed: {e}")
            continue

        taken = 0
        for title in titles:
            if taken >= 2:
                break
            time.sleep(REQ_DELAY_S)
            try:
                info = file_info(title)
            except Exception as e:  # noqa: BLE001
                print(f"  info failed for {title}: {e}")
                continue
            if not info or not info["url"]:
                continue
            lic = info["license"]
            if not LICENSE_ALLOWED.search(lic):
                print(f"  skipped (licence '{lic}' not recognised as free): {title}")
                continue

            # Derive extension from the URL path only — the API appends
            # ?utm_* query params which corrupt Path(url).suffix.
            clean_url = info["url"].split("?")[0]
            ext = Path(clean_url).suffix.lower() or ".wav"
            safe_id = re.sub(r"[^A-Za-z0-9]+", "_", title.removeprefix("File:"))[:60]
            fname = f"WC_{safe_id}{ext}"
            path = SAMPLE_DIR / fname
            if path.exists():
                try:
                    checks = verify_audio(path)
                    entries.append(_entry(label, sci, info, fname, checks, path, reused=True))
                    taken += 1
                    continue
                except Exception:  # noqa: BLE001
                    path.unlink(missing_ok=True)

            print(f"  downloading: {title} [{lic}]")
            try:
                download(info["url"], path, info["description_url"] or "https://commons.wikimedia.org/")
                checks = verify_audio(path)
                entries.append(_entry(label, sci, info, fname, checks, path, reused=False))
                taken += 1
                print(
                    f"    ok: {checks['duration_seconds']}s @ {checks['sample_rate']}Hz "
                    f"{checks['channels']}ch"
                )
            except Exception as e:  # noqa: BLE001
                print(f"    download/verify failed: {e}")
                path.unlink(missing_ok=True)

        if taken == 0:
            print(f"  NO usable recording for {label} — reported honestly, no substitute audio")

    MANIFEST.write_text(
        json.dumps(
            {
                "policy": "Audio files are NOT committed to Git. Re-run this script to fetch them under their individual licences.",
                "source": "Wikimedia Commons (MediaWiki action=query API). Xeno-canto was tried first; its API returned 404 in this environment.",
                "retrieved": datetime.now(timezone.utc).isoformat(),
                "usage": "Local pipeline smoke tests and in-app demo samples only. Not a field test. Not an accuracy benchmark.",
                "label_provenance": "Species names come from the uploader's own identification on Commons.",
                "samples": entries,
            },
            indent=2,
            ensure_ascii=False,
        ),
        "utf-8",
    )
    print(f"\nManifest written: {MANIFEST} ({len(entries)} samples)")
    return 0 if entries else 1


def _entry(label: str, sci: str, info: dict, fname: str, checks: dict, path: Path, reused: bool) -> dict:
    return {
        "id": fname,
        "species_label": f"{label} (source claim)",
        "scientific_name": sci,
        "file": fname,
        "source_page_url": info["description_url"],
        "direct_file_url": info["url"],
        "creator": info["artist"] or "see Commons page",
        "license": info["license"],
        "attribution": (info["attribution"] or info["credits"] or f"Wikimedia Commons: {info['title']}")[:400],
        "downloaded_at": datetime.now(timezone.utc).date().isoformat(),
        "checksum_sha256": sha256(path),
        "label_independently_verified": False,
        "audio_checks": checks,
        "already_on_disk": reused,
        "notes": "Metadata-based smoke test input only; uploader label not independently verified.",
    }


if __name__ == "__main__":
    raise SystemExit(main())
