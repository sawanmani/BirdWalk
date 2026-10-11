"""Validate the exact calls hf-space/app.py's rpc() bridge makes.

Runs the copied `birdwalk_api` package in process with Starlette's TestClient,
which is precisely what the Space does, so a green run here means the bridge
routes work. From the repo root:

    backend\\.venv\\Scripts\\python.exe scripts\\check_space_bridge.py
"""
from __future__ import annotations

import ast
import base64
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "hf-space"))

CLIP = ROOT / "data/samples/WC_Indian_robin_call_and_song_recorded_in_February_2022_at_Hari.wav"


def main() -> int:
    ast.parse((ROOT / "hf-space/app.py").read_text(encoding="utf-8"))
    print("app.py parses OK")

    from fastapi.testclient import TestClient

    from birdwalk_api.main import app as api_app

    client = TestClient(api_app)

    health = client.get("/api/health")
    print("health", health.status_code, health.json())

    info = client.get("/api/model-info")
    print("model_info", info.status_code, info.json().get("name"))

    samples = client.get("/api/samples")
    print("samples", samples.status_code, len(samples.json()["samples"]), "entries")

    species = client.get("/api/india-species", params={"q": "bulbul"})
    payload = species.json()
    print("india_species", species.status_code, payload["total_verified"], "verified;",
          len(payload["species"]), "match 'bulbul'")

    mission = client.post(
        "/api/mission",
        json={"top_species": "Indian Robin", "model_score": 0.91, "uncertain": False},
    )
    print("mission", mission.status_code, mission.json()["mission"]["title"][:60])

    raw = CLIP.read_bytes()
    print(f"analyze payload: {len(raw)} bytes -> {len(base64.b64encode(raw))} b64 chars")
    res = client.post(
        "/api/analyze",
        files={"file": (CLIP.name, raw, "application/octet-stream")},
    )
    body = res.json()
    print("analyze", res.status_code, "status=", body.get("status"))
    for p in (body.get("predictions") or [])[:3]:
        print("   ", p["species_common_name"], p["model_score"])

    # The failure paths the bridge must not paper over.
    bad = client.post("/api/analyze", files={"file": ("x.txt", b"not audio", "text/plain")})
    print("rejects non-audio:", bad.status_code, bad.json().get("detail", "")[:50])
    unknown = client.post("/api/analyze", params={"sample_id": "nope"})
    print("unknown sample_id:", unknown.status_code)

    assert res.status_code == 200 and body["predictions"], "real inference must work"
    print("\nBRIDGE OK:", json.dumps({"status_code": res.status_code}) )
    return 0


if __name__ == "__main__":
    sys.exit(main())
