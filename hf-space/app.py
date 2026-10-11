"""BirdWalk on Hugging Face Spaces — Gradio SDK, free ZeroGPU tier.

Measured on this Space, not assumed: ZeroGPU containers already own port 7860
before user code runs, expose no PORT/APP_PORT (only GRADIO_NUM_PORTS=1), and do
not serve our app for us. A raw `uvicorn.run(..., port=7860)` therefore dies with
EADDRINUSE and crash-loops, which is why this file uses the documented
`demo.launch()` form: Gradio itself negotiates the platform's port setup.

Consequence, stated plainly: the FastAPI surface (`/api/health`, `/api/analyze`,
...) is NOT served here. This Space is the analysis demo; the JSON contract the
React frontend speaks is only available when BirdWalk runs locally (or on
hardware that permits a custom server).

The analysis function carries `@spaces.GPU` because the platform demands it:
ZeroGPU refuses to start a Space with no GPU function at all ("No @spaces.GPU
function detected during startup"), even though BirdNET here runs entirely on
CPU. That lease is a real cost, not a freebie - see below.

The service code under `birdwalk_api/` is a copy of `../backend/app` so this
folder can be pushed to a Space repo on its own — see README.md for the
one-line command that refreshes the copy.
"""
from __future__ import annotations

import base64
import json
from pathlib import Path

# BirdNET's ~274 MB weights are not in Git and a Space's disk is ephemeral, so
# a cold start has to fetch them. Doing it here (once, at boot) keeps the first
# user request from timing out. If it fails we deliberately carry on: the demo
# reports the real failure instead of pretending.
try:  # pragma: no cover - depends on upstream package layout
    from birdnet_analyzer.utils import ensure_model_exists

    ensure_model_exists()
except Exception:  # noqa: BLE001
    pass

import gradio as gr  # noqa: E402

from birdwalk_api.main import _analyze_path  # noqa: E402
from birdwalk_api.services.audio_service import AudioError  # noqa: E402


def render(resp) -> str:
    """Format an AnalyseResponse the honest way."""
    if resp.status != "ok" or not resp.predictions:
        return resp.note
    lines = [
        f"{p.species_common_name} — model score {p.model_score:.2f}"
        for p in resp.predictions
    ]
    return "\n".join(lines) + f"\n\n{resp.note}"


# ZeroGPU will not run a Space that declares no GPU function, so the analysis
# call is decorated even though BirdNET uses only CPU. The cost is real: every
# analysis leases GPU time and consumes the visitor's daily ZeroGPU quota
# (2 min anonymous, 5 min for a free account) and may queue behind a busy GPU
# pool - for a CPU model that is pure overhead, imposed by the platform.
try:  # pragma: no cover - `spaces` only exists on Hugging Face hardware
    import spaces

    gpu_lease = spaces.GPU(duration=20)
except Exception:  # noqa: BLE001 - off-Space runs have no `spaces` package

    def gpu_lease(fn):
        return fn


@gpu_lease
def analyse(file: str | None) -> str:
    """Run the real pipeline. No fixture path, no invented species."""
    if not file:
        return "Record or upload a clip first."
    try:
        resp = _analyze_path(Path(file), None, is_sample=False)
    except AudioError as e:
        return f"Could not analyse that clip: {e}"
    except Exception as e:  # noqa: BLE001 - surface the failure, never fake it
        return f"Inference failed ({e.__class__.__name__})."
    return render(resp)


def species_list(_: str = "") -> str:
    """The India shortlist, straight from the checked-in data file.

    The file is a dict: {generated_at, method, disclaimer, total_candidates,
    verified_count, species: [{species_common_name, species_scientific_name,
    label_verified}], rejected: [...]}. Only verified labels are listed.
    """
    import json

    path = Path(__file__).parent / "birdwalk_api" / "data" / "india_species.json"
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        return f"Could not load the species list ({e.__class__.__name__})."
    rows = [s for s in doc.get("species", []) if s.get("label_verified")]
    if not rows:
        return "No verified species list available."
    names = [
        f"{s.get('species_common_name', '?')} ({s.get('species_scientific_name', '?')})"
        for s in rows
    ]
    header = (
        f"{len(names)} of {doc.get('total_candidates', '?')} candidates matched a "
        f"BirdNET V2.4 label.\n{doc.get('disclaimer', '')}\n\n"
    )
    return header + "\n".join(names)


# ---------------------------------------------------------------------------
# JSON bridge for the React frontend.
#
# ZeroGPU will not let us bind a port, so the FastAPI routes are unreachable
# from outside. Rather than duplicate the contract, the *real* FastAPI app is
# called in process through Starlette's TestClient: same handlers, same Pydantic
# schemas, same status codes, no listening socket. Only the whitelisted route
# names below can be reached, so this is not an open proxy.
#
# It is deliberately NOT decorated with @spaces.GPU: BirdNET uses CPU here, so
# these calls do not spend a visitor's daily ZeroGPU quota.
# ---------------------------------------------------------------------------
_MAX_B64_CHARS = 34_000_000  # ~25 MB of audio, matching the backend's cap


def _make_client():
    from fastapi.testclient import TestClient

    from birdwalk_api.main import app as api_app

    return TestClient(api_app)


try:  # pragma: no cover - needs httpx, which Gradio already requires
    _client = _make_client()
except Exception as _exc:  # noqa: BLE001 - report through rpc rather than crash boot
    _client = None
    _bridge_error = f"{type(_exc).__name__}: {_exc}"
else:
    _bridge_error = None


def _err(status: int, detail: str) -> str:
    return json.dumps(
        {"status_code": status, "body": json.dumps({"detail": detail})}
    )


def rpc(route: str, payload: str) -> str:
    """Run one whitelisted API route in process and hand back its response."""
    if _client is None:
        return _err(500, f"API bridge unavailable: {_bridge_error}")
    try:
        body = json.loads(payload) if payload else {}
        if not isinstance(body, dict):
            raise ValueError("payload must be a JSON object")
    except (json.JSONDecodeError, ValueError) as e:
        return _err(400, f"Bad payload: {e}")

    try:
        if route == "health":
            res = _client.get("/api/health")
        elif route == "model_info":
            res = _client.get("/api/model-info")
        elif route == "samples":
            res = _client.get("/api/samples")
        elif route == "india_species":
            res = _client.get(
                "/api/india-species",
                params={"q": body["q"]} if body.get("q") else None,
            )
        elif route == "mission":
            res = _client.post("/api/mission", json=body)
        elif route == "analyze":
            b64 = body.get("b64") or ""
            if len(b64) > _MAX_B64_CHARS:
                return _err(413, "File exceeds the 25 MB limit.")
            try:
                raw = base64.b64decode(b64)
            except Exception:  # noqa: BLE001
                return _err(422, "Upload was not valid base64.")
            res = _client.post(
                "/api/analyze",
                files={
                    "file": (
                        str(body.get("name", "clip.wav")),
                        raw,
                        "application/octet-stream",
                    )
                },
                data=(
                    {"source_label": str(body["source_label"])}
                    if body.get("source_label")
                    else None
                ),
            )
        elif route == "analyze_sample":
            res = _client.post(
                "/api/analyze", params={"sample_id": body.get("sample_id", "")}
            )
        else:
            return _err(404, f"Unknown route '{route}'.")
        return json.dumps({"status_code": res.status_code, "body": res.text})
    except Exception as e:  # noqa: BLE001 - never fake a success
        return _err(500, f"{type(e).__name__}: {e}")


with gr.Blocks(title="BirdWalk") as demo:
    gr.Markdown(
        "## 🐦 BirdWalk\n"
        "Three seconds of bird sound, analysed by BirdNET GLOBAL 6K V2.4 on "
        "**CPU** — no GPU. Model scores are *not accuracy*: treat the top name "
        "as a possible match worth checking, never a certainty."
    )
    with gr.Row():
        with gr.Column():
            audio = gr.Audio(
                sources=["upload", "microphone"], type="filepath", label="Clip"
            )
            btn = gr.Button("Analyse", variant="primary")
        with gr.Column():
            out = gr.Textbox(label="What we heard", lines=10)
    btn.click(analyse, inputs=audio, outputs=out, api_name="analyse")
    gr.Markdown("### India shortlist")
    region_in = gr.Textbox(label="Region filter", value="india", visible=False)
    species_out = gr.Textbox(label="Species we expect to hear", lines=12)
    demo.load(species_list, inputs=region_in, outputs=species_out, api_name="species")

    # Machine-facing bridge used by the React app (via the Vercel /api proxy).
    # Hidden: it is an API, not part of the demo UI.
    with gr.Row(visible=False):
        route_in = gr.Textbox(label="route", value="health")
        payload_in = gr.Textbox(label="payload", value="{}")
        rpc_out = gr.Textbox(label="bridge response")
    rpc_btn = gr.Button("rpc", visible=False)
    rpc_btn.click(rpc, inputs=[route_in, payload_in], outputs=rpc_out, api_name="rpc")

if __name__ == "__main__":
    # show_error: without it the Space hides the real exception and every
    # failure looks identical ("the upstream app raised an exception").
    demo.launch(show_error=True)
