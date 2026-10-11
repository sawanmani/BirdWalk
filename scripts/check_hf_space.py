"""End-to-end check of the deployed BirdWalk Space (no local model needed).

Exercises the route the React app will actually use: Gradio's `/call/rpc`
bridge, which runs the real FastAPI handlers in process on the Space. Run from
the repo root:

    python scripts/check_hf_space.py [path/to/clip.wav]

Needs `gradio_client`. The clip is sent as base64 inside the JSON payload, so
no Gradio file-upload dance is involved.
"""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

SPACE = "https://adarshmani-birdwalk.hf.space/"
DEFAULT_CLIP = Path("data/samples/WC_Indian_robin_call_and_song_recorded_in_February_2022_at_Hari.wav")


def main() -> int:
    clip = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CLIP
    if not clip.exists():
        print(f"FAIL: no such clip: {clip}")
        return 2

    from gradio_client import Client

    client = Client(SPACE, verbose=False)

    def rpc(route: str, payload: dict | None = None) -> dict:
        raw = client.predict(route, json.dumps(payload or {}), api_name="/rpc")
        envelope = json.loads(raw)
        return {"status": envelope["status_code"], "body": json.loads(envelope["body"] or "null")}

    health = rpc("health")
    print("health:", health["status"], health["body"])

    species = rpc("india_species", {"q": "bulbul"})
    print("india_species:", species["status"], "verified",
          species["body"].get("total_verified"), "->", len(species["body"].get("species", [])), "hits")

    mission = rpc("mission", {"top_species": "Indian Robin", "model_score": 0.91})
    print("mission:", mission["status"], mission["body"]["mission"]["title"])

    b64 = base64.b64encode(clip.read_bytes()).decode()
    print(f"analyzing {clip.name} ({len(b64)} b64 chars) ...")
    result = rpc("analyze", {"name": clip.name, "b64": b64})
    body = result["body"]
    print("analyze:", result["status"], "status=", body.get("status") or body.get("detail"))
    for p in (body.get("predictions") or [])[:3]:
        print(f"    {p['species_common_name']} — {p['model_score']}")

    bad = rpc("analyze", {"name": "x.txt", "b64": base64.b64encode(b"not audio").decode()})
    print("non-audio rejected with:", bad["status"], bad["body"].get("detail", "")[:40])
    unknown = rpc("nope_route")
    print("unknown route rejected with:", unknown["status"])

    assert result["status"] == 200 and body.get("predictions"), "real inference must work on the Space"
    print("\nSPACE BRIDGE OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
