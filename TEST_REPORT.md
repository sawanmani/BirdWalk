# BirdWalk — Test Report

All results below were actually executed and observed on this machine.
Anything not verified here is listed under "NOT TESTED" — nothing is
claimed beyond the evidence.

> Re-run in full during the **pre-submission audit on 2026-10-11**; the
> counts, timings and model-asset figures below are from that run. New
> audit coverage (readiness split, offline honesty, real top-k artifact,
> metadata-consistency and `no_reliable_detection` path tests) is included.

## 1. Environment (measured)

| Item | Value |
|---|---|
| OS | Windows (26H2), PowerShell |
| Python (backend venv) | 3.12.3 (MSC v.1938, AMD64) |
| TensorFlow | 2.21.0 (CPU, oneDNN on) |
| FastAPI / starlette TestClient | fastapi 0.143.0 |
| BirdNET-Analyzer | pip `birdnet-analyzer==2.4.0` (package `__version__` prints `2.3.0` — known quirk, see MODEL_CARD.md) |
| Model | BirdNET GLOBAL 6K V2.4. V2.4 model + label assets measured at **274.5 MB** in `checkpoints/V2.4/` (TF SavedModel used for inference 58.4 MB, TFLite FP32 51.7 MB), downloaded on first use; **6,522** labels (counted from the shipped label file). The old "224 MB SavedModel" figure was never measured and is corrected. |
| Node / npm | v26.2.0 / 11.13.0 |

## 2. Automated test suites

### Backend — pytest (unit, no model run)

Command:
```
backend\.venv\Scripts\python.exe -m pytest -q
```
Result (final run, 2026-10-11):
```
36 passed, 3 deselected, 1 warning in 0.49s
```
Coverage: API contract shapes (`/api/health`, `/api/model-info`,
`/api/samples`, `/api/analyze`, `/api/india-species`), validation paths
(400 missing input, 415 wrong extension, 413 oversize file +
over-duration, 422 corrupt audio + silent audio, 404 unknown/deleted
sample + sample-id path-traversal blocked), 503 when the model errors
(monkeypatched), **readiness honesty** (`model_ready` is the conjunction
of `package_available` AND `model_assets_available`; assets-missing and
package-missing each force `model_ready=False`; a failed inference is
surfaced via `health.last_inference_error`), **offline honesty**
(`airplane_mode_verified is False`, the conflated `offline_after_download`
flag is gone), the honest **`no_reliable_detection`** status for
below-floor and empty results (deterministic, no TF), mission
determinism + safety wording + universal-mission fallback, `aggregate()`
max/rank/cap and `"None"`-row filtering, **metadata consistency**
(`data/model_outputs.json` agreement count + checksums match the
manifest; Red-whiskered Bulbul is `Pycnonotus jocosus`, never `cafer`;
uploader labels flagged unverified; authoritative label count 6,522),
and the truth rule that **no response field name** contains
"accuracy"/"probability".

### Backend — pytest (integration, real BirdNET inference)

Command:
```
backend\.venv\Scripts\python.exe -m pytest -q -m integration
```
Result (2026-10-11):
```
3 passed, 36 deselected, 2 warnings in 12.17s
```
1. `sample_id` analysis of the Asian Koel Ogg — real inference through
   the whole pipeline; rank 1 prediction returned; recursive field-name
   check for "accuracy" passed.
2. 20 s stereo 44.1 kHz slice (the format class that broke the raw
   analyzer in Phase 3) uploaded as WAV — normalisation path handled
   it: HTTP 200 with predictions.
3. Mission contract for three species inputs — deterministic, safe,
   schema-valid.

### Frontend — type-check + production build

Command:
```
cd frontend && npm run build
```
Result (final run, 2026-10-11):
```
✓ 2337 modules transformed.
✓ built in 1.30s
```
`tsc -b` clean (the split `online_assets_missing` / `online_package_missing`
readiness states and the three offline fields type-check across
`types.ts`/`api.ts`/`useBackendStatus.ts`/`Header.tsx`/`App.tsx`/`AboutPanel.tsx`);
Vite build produced `dist/` with self-hosted font assets (no CDN runtime
dependency for fonts).

### Sample outputs — real top-k artifact

Command:
```
backend\.venv\Scripts\python.exe scripts\record_sample_outputs.py
```
Runs the **production** pipeline (`_analyze_path`: validate → normalise →
official `analyze()` → per-species max) on all 5 bundled clips and writes
the verbatim top-3 predictions + scores to `data/model_outputs.json`
(committed). Result (2026-10-11):
```
Clips=5 agreements=5 errors=0
```
Top-1 (model_score): Indian Robin 0.9994 · Red-whiskered Bulbul 0.6378 ·
Red-whiskered Bulbul 0.9611 · Asian Koel 0.9748 · Asian Koel 0.9986. This
is **source-label agreement on 5 curated clips (a smoke test), not
accuracy** — see section 6.

## 3. Live-server HTTP evidence (uvicorn on 127.0.0.1:8000)

Observed during Phase 4/9 runs against a real server:

- `GET /api/health` → `{"status":"ok","model_loaded":true,…}`
  (`model_loaded` is honestly `false` until the first real inference).
- `GET /api/samples` → 5 manifest entries, all present on disk.
- `POST /api/analyze?sample_id=WC_Asian_Koel_ogg.ogg` → status `ok`,
  rank 1 **Asian Koel, model_score 0.9748**; `source_label` rendered
  as an uploader claim, `is_demo_fixture: false`.
- `POST /api/analyze` upload of the Indian Robin WAV (browser round 2)
  → **Indian Robin, model_score 0.9994**.
- `POST /api/mission` → identical requests produce byte-for-byte
  identical missions (no LLM, no network dependency).
- `GET /api/india-species?q=drongo` → filtered verified labels;
  `?q=zzz` → empty list + honest empty-state text in UI.
- Temp-file hygiene after every run: **0 leftover `birdwalk_*`
  directories** in `%TEMP%` (cleanup in `finally`).

## 4. Negative-detection path (honesty check)

Command:
```
backend\.venv\Scripts\python.exe scripts\check_negative_path.py
```
Synthetic birdless pinkish noise (6 s WAV) uploaded to the live API:
```
HTTP 200
status: no_reliable_detection
note: … strongest model score was 0.01 …
```
The app does not force a bird onto non-bird audio at the API level.
(Unit tests also pin the `RELIABLE_SCORE_FLOOR = 0.30` status logic.)

False-positive evidence kept on record: the Phase 2 sine tone produced
"Buff-spotted Flufftail 0.6407" from the raw analyzer — scores must
never be presented as accuracy or certainty, and the UI says so.

## 5. Browser end-to-end rounds (Browser subagent, Chromium)

Three rounds; the app ran on Vite dev :5173 against live backend :8000.

Round 1 — sample flow:
- Landing shows "Local model ready" pill; sample panel lists 5 entries.
- Asian Koel click → auto-analyze → results show model score wording
  (not "accuracy") → mission card → phone-away → completion. Zero
  console errors.
- Found gap: source-claim note missing from results view → fixed
  (ResultCard now renders the uploader-claim sentence).

Round 2 — after fixes:
- Source-claim note visible for samples, absent for own uploads ✅.
- Upload of the Indian Robin WAV → real inference 0.9994 ✅.
- Phone-away timer → completion → journal entry persisted (localStorage) ✅.
- Zero console errors.
- Found gap: timer expiry re-showed the start button → fixed with an
  explicit elapsed state ("Time — look up. Tap done when you're ready.").

Round 3 — Phase 8 UI + responsiveness + a11y:
- India shortlist section: "69 verified in the model's label set",
  debounce search works, "drongo" filters, "zzz" shows the honest
  empty state ✅.
- 360 px viewport layout checks passed.
- Found real bug (WCAG 2.4.7): the India search input had
  `outline-none` with no replacement focus indicator → fixed with a
  `focus-within` outline on the label wrapping the field. Build and
  tests re-run green after the fix (section 2), and a follow-up
  browser check confirmed the fix live: while the input is focused,
  the wrapping label computes `outline-style: solid`, `3px`,
  `rgb(40, 90, 69)` (≈7.96:1 contrast on white — passes WCAG 1.4.11),
  and the outline disappears on blur (focus-driven, not always-on);
  "drongo" filtering still worked; 0 console errors. (Keyboard Tab
  traversal itself was exercised via programmatic focus because the
  automated window was hidden; both paths trigger the same
  `:focus-within` rule.)
- Note: the negative `no_reliable_detection` branch was **not**
  triggered by the five existing samples in the UI (all contain
  strongly detected birds once normalised — the Phase 3 "negative"
  came from the raw analyzer on an unnormalised 113 s file). The UI
  branch is verified by unit tests on the status logic plus the live
  API-level noise probe in section 4.

## 6. Source-label agreement (explicitly NOT accuracy)

Two levels, kept separate (full numbers in `data/model_outputs.json` and
MODEL_CARD.md §4):

- **Production pipeline (normalised)** — the path the app actually runs:
  **5 of 5** clips' top-1 prediction agreed with the uploader's claimed
  common name (Indian Robin 0.9994; Red-whiskered Bulbul 0.6378 and
  0.9611; Asian Koel 0.9748 and 0.9986).
- **Raw analyzer (pre-normalisation, Phase 3)** — 3 of 5 agreed; the
  un-normalised 113 s stereo/long files produced one honest
  `no_reliable_detection` and one decode failure, which is exactly why
  the backend normalises audio before inference.

In every case the species labels are **uploaders' own claims**, not ground
truth (`label_independently_verified: false`). "Agreement" means the model
agreed with the uploader's label — it is **not** an accuracy measurement.
Five curated clips are a **metadata-based smoke test of the pipeline only**.
**No personal field test was conducted**, and no general model accuracy is
claimed.

## 7. NOT TESTED (recorded honestly, not claimed)

- **Microphone recording on a real device.** The browser recording
  path is implemented and client-side WAV conversion is unit-tested
  logic-wise only; no physical-device E2E run was performed here
  (automation cannot grant a mic). The UI shows a NOT TESTED note.
- **Airplane-mode / fully disconnected operation.** The model runs
  locally after its one-time download, but a disconnected-OS test was
  not performed. Claim is scoped to "runs on this machine after first
  download" in UI and docs.
- **Gemma / Ollama generation (Phase 7).** Ollama binary present, no
  running instance available; integration was NOT implemented and is
  NOT claimed. Missions are deterministic templates only.
- **Deployment, mobile browsers, other OSes, large-audio performance.**
  Out of scope for this demo; nothing claimed.
- **Android/iOS native offline inference.** Not attempted; the demo is
  a local web app + local backend.
