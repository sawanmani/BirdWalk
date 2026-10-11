---
title: BirdWalk API
emoji: 🐦
colorFrom: green
colorTo: yellow
sdk: gradio
app_file: app.py
app_port: 7860
# ZeroGPU only offers these two interpreters; BirdNET needs >=3.11.
python_version: "3.12.12"
hardware: zeroGPU
pinned: false
license: mit
short_description: BirdNET bird-sound analysis - free ZeroGPU, CPU only
tags:
  - audio
  - birds
  - fastapi
---

# BirdWalk on Hugging Face Spaces

The BirdWalk backend on HF's **free ZeroGPU tier** (the old free "CPU basic"
hardware is no longer offered). BirdNET itself runs on **CPU**, but the tier
still forces a GPU lease per analysis — see below.

## Why the ZeroGPU tier works at all (and what it costs)

* Free accounts in good standing (verified email, older than 30 days) may host
  up to 2 ZeroGPU Spaces. The old free "CPU basic" hardware is gone, so
  ZeroGPU is the only no-cost option.
* **A GPU function is mandatory.** Without one the platform refuses to start
  the Space: `No @spaces.GPU function detected during startup`. BirdNET runs on
  CPU here, so `analyse()` is decorated purely to satisfy that check — and the
  cost is real: every analysis leases a GPU, consumes the caller's daily quota
  (2 min anonymous, 5 min per free account) and can queue behind a busy pool.
* ZeroGPU Spaces are restricted to the **Gradio SDK** — which is what this
  Space uses (`sdk: gradio`). The SDK forces `gradio[oauth,mcp]==6.30.0`, so
  `requirements.txt` must never pin gradio itself.
* Supported interpreters are fixed (3.12.12 / 3.10.13). TensorFlow has no 3.14
  wheels and BirdNET needs >=3.11, so `python_version` is pinned to 3.12.12.

Hosting requirements for the free tier: account in good standing, verified
email, older than 30 days, maximum 2 ZeroGPU Spaces.

Verified against the live Space with `python scripts/check_hf_space.py` (from
the repo root): a recorded Indian robin clip came back as
`Indian Robin — model score 0.9994`, with the honesty note attached. The same
route table can also be checked without deploying the proxy, via
`node scripts/check_proxy.mjs`.

BirdNET GLOBAL 6K V2.4 is a ~58 MB TensorFlow SavedModel; CPU inference on a
3-second clip takes a couple of seconds, which is fine for a demo.

## What this Space serves

| Path | What it is |
| --- | --- |
| `/` | A Gradio demo: upload or record a clip → top matches, plus the India shortlist. |
| `/gradio_api/call/analyse`, `/gradio_api/call/species` | Gradio's auto-generated JSON API for those two UI functions. |
| `/gradio_api/call/rpc` | The bridge that serves the React app's whole `/api/*` contract. |
| `/api/*` | **Not served.** The frontend reaches the same handlers through `rpc` instead. |

> **Why the contract needs a bridge.** ZeroGPU containers already own port 7860
> before user code runs, set no `PORT`/`APP_PORT` (only `GRADIO_NUM_PORTS=1`),
> and do not launch our app on our behalf. A custom `uvicorn.run(..., port=7860)`
> dies with `EADDRINUSE` and crash-loops the Space — measured over four rebuilds
> here and confirmed as an open, unanswered problem on the HF forum. So `app.py`
> uses the documented `demo.launch()` form and runs the real FastAPI handlers
> **in process** through `fastapi.testclient.TestClient`, behind one hidden
> Gradio event named `rpc`. Nothing is re-implemented: same handlers, same
> schemas, same 413/415/404 behaviour. `rpc` carries no `@spaces.GPU`, so a
> visitor spends none of the Space's GPU quota.
>
> Two things cost me a full deploy cycle to find, so they are recorded here:
> the REST prefix is **not** `/call/...` — Gradio 6 serves `/gradio_api/call/...`
> and reports it in `/config` as `api_prefix`, while a wrong path answers
> `405 Method Not Allowed` from the SPA fallback instead of a 404; and the
> result arrives as a bare JSON array on the SSE stream, not as `{"data": ...}`.

The deployed React app talks to this bridge through one Vercel function,
`frontend/api/[...all].ts`, which turns same-origin `/api/*` requests into `rpc`
calls. That keeps `src/lib/api.ts` unchanged and the CORS hop server-side.
Verified against the live deployment with `node scripts/check_vercel.mjs`:
`/api/health`, `/api/model-info`, `/api/samples` (5 entries), `/api/india-species`,
`POST /api/mission`, `POST /api/analyze` with a 2.4 MB WAV upload *and* the
`?sample_id=` path all returned the same `Indian Robin — model score 0.9994` as
the local backend, with a bad extension rejected as 415 and an unknown route as
404.

## Where this code comes from

`birdwalk_api/` is a **copy** of `../backend/app`. A Space is its own git
repo, so it cannot import from the main repository. Refresh the copy after
any backend change (from the repo root, PowerShell):

```powershell
Remove-Item hf-space\birdwalk_api -Recurse -Force
Copy-Item backend\app hf-space\birdwalk_api -Recurse
Get-ChildItem hf-space\birdwalk_api -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force
```

> **Then re-apply the two Space-only edits in
> `birdwalk_api/core/config.py`**, which the copy above overwrites: the path
> block (`ROOT = parents[2]`, `SAMPLE_DIR = ROOT / "samples"`) because the
> package sits one level shallower inside a Space, and the `offline_scope_note`
> wording, because "runs on your own machine" is false for a hosted endpoint.
> Skipping the first silently empties `/api/samples`; skipping the second puts
> an untrue claim in the UI.

The backend test suite still runs against `backend/`, not this copy — so the
copy is only ever as trustworthy as the last time you ran the command above.

## Honest limits of this deployment

- **Model weights are not in Git.** `app.py` calls the upstream package's
  `ensure_model_exists()` at boot, which downloads ~274 MB into the container.
  A Space's disk is ephemeral, so every cold start and every rebuild pays for
  it again.
- **Cold starts are slow.** TensorFlow import plus the weight download means
  the first request after idle can take a minute or more.
- **Sample clips are hosted here, unlike in Git.** `samples/` carries the five
  licensed Wikimedia recordings plus `manifest.json` so that a visitor with
  nothing installed can still use the "try a sample" flow. The GitHub
  repository still does not commit the audio (licence and size — see
  `data/samples/README.md`); `samples/` is therefore ignored by this repo's
  `.gitignore` and reproduced by copying from `data/samples/` after
  `python scripts/download_samples.py`.
- **Privacy claim changes.** Locally, uploads never leave the machine. On a
  Space, audio is uploaded to Hugging Face infrastructure. The frontend now
  branches its copy on `backendRunsOnThisMachine()` (`src/lib/api.ts`): the
  local build keeps the local-first wording, the deployed site says the demo
  server analyses and does not store the audio.
- **Scores are model output, not accuracy**, and this Space is public: anyone
  can post audio to it. BirdNET weights are CC BY-NC-SA 4.0 (non-commercial).
