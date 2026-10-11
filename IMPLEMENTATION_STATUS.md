# BirdWalk — Implementation Status

Maintained by the implementation agent. Every "done" item below was run
and observed. Unverified items are marked `NOT TESTED`.

## Phase 0 — Repository audit (DONE)

### Environment (actual, measured)

| Item | Value |
|---|---|
| OS | Windows (26H2), PowerShell shell |
| Node | v26.2.0 |
| npm | 11.13.0 |
| Python (default `python`) | 3.12.3 |
| Python launcher versions | 3.14, 3.12 (no 3.11 installed) |
| pip | 24.0 |
| git | 2.55.0.windows.2 |

### Repository before implementation

Docs only: `START_HERE.md`, `CONTEXT.md`, `ALIGNMENT.md`, `SKILLS.md`,
`BUILD_PROMPTS.md`, plus two research notes
(`Hacktoberfest_Touch_Grass_Winning_Analysis.md`,
`BirdWalk_AI_Execution_Plan.md`). No code to preserve.

### Deviations / decisions recorded up front

1. **Python 3.12 instead of 3.11.** The locked stack says Python 3.11,
   but 3.11 is not installed on this machine. The selected ML package
   requires `>=3.11` and TensorFlow 2.20 has Windows wheels for 3.12
   (not for the installed 3.14). 3.12 is the only version that keeps
   the locked BirdNET route working. No framework change.
2. **Model route chosen: official `BirdNET-Analyzer` 2.4.0 (PyPI).**
   Verified by downloading the wheel and reading its metadata:
   author Stefan Kahl (BirdNET team, Cornell), `License: MIT`
   (source code), model weights `CC BY-NC-SA 4.0` per its README.
   Requires `tensorflow>=2.20`, `librosa`, `resampy`, `pandas`,
   `tqdm`, `kagglehub`. Upstream badge markets ~6K classes; the shipped
   V2.4 label file actually contains **6,522** entries (authoritative
   count, measured 2026-10-11 in the audit — see "Label counts" below).
   This is the "maintained official BirdNET ecosystem package" that
   SKILLS.md Skill 5 prefers.
3. **Licence note for contest claims:** BirdNET's README states
   educational/research use is non-commercial, which covers this
   Hacktoberfest demo; attribution and CC BY-NC-SA terms must be
   preserved. We will say "pretrained model with locally runnable
   inference", never "fully open source" for the weights.
4. **Tailwind v4 token style.** `BUILD_PROMPTS.md` lists
   `tailwind.config.ts` (v3 layout). Current Tailwind is v4, which
   defines design tokens in CSS via `@theme`. Same token system,
   different file. Documented adaptation, stack unchanged.

### Acceptance checklist (from ALIGNMENT.md §10 + BUILD_PROMPTS.md §5)

- [x] Frontend starts and `npm run build` passes — DONE (tsc -b + vite build ✓, preview HTTP 200; re-verified green after final fixes)
- [x] Real BirdNET-Analyzer model loads and predicts one audio file — DONE (see Phase 2/3 results)
- [x] ≥3 legally usable samples via reproducible downloader + manifest — DONE (5 samples, all CC BY-SA 4.0)
- [x] FastAPI: `/api/health`, `/api/model-info`, `/api/analyze` (+ `/api/samples`, `/api/mission`, `/api/india-species`) + pytest — DONE (Phases 4/8/9: 26 unit + 3 integration green)
- [x] End-to-end record/upload/sample → real inference → results — DONE (browser E2E rounds 1–3: sample + upload paths with real inference; mic-on-device NOT TESTED, see below)
- [x] "Model score" language everywhere; never "accuracy" — enforced in `types.ts`, UI, docs; test checks no field NAME says accuracy
- [x] Missions deterministic, safe, work with no LLM / no network — DONE (Phase 6; sha256-keyed templates, safety-wording tests; Gemma omitted honestly — Phase 7)
- [x] localStorage history with delete — implemented (`lib/history.ts`); journal persistence verified in browser round 2
- [x] Offline claims only for what is actually tested disconnected — claims are scoped in UI + README to "runs on this machine after first model download" (no-network-in-analysis-path verified by code + temp-cleanup evidence); airplane-mode run itself NOT TESTED and said so
- [x] Responsive (360px), a11y: focus, aria-live, reduced motion, 44px taps — DONE (360 px checks in browser round 3; focus-indicator bug found & fixed and re-verified live: 3px solid pine `:focus-within` outline, ≈8:1 contrast, 0 console errors; `prefers-reduced-motion` respected via hook + CSS)
- [x] MODEL_CARD.md & TEST_REPORT.md — DONE; THIRD_PARTY_NOTICES.md, README.md, LICENSE — DONE (Phase 10)

### Risks / blockers (actual, current)

1. **TensorFlow install size/time** on Windows CPU — RESOLVED: install
   completed (TF 2.21.0), the V2.4 model + label assets (measured 274.5 MB
   total in `checkpoints/V2.4/`; the TensorFlow SavedModel used for inference
   is 58.4 MB, TFLite FP32 51.7 MB) downloaded via the analyzer's official
   mechanism and cached locally. The earlier "224 MB" figure was never
   measured and is corrected here.
2. **No personal field test possible for the builder today** — online
   samples are metadata-based smoke tests only (CONTEXT.md §9). Labeled
   exactly that way in manifest, MODEL_CARD.md, and UI ("source claim").
3. **Source-label agreement ≠ accuracy.** Reported as "source-label
   agreement on 5 clips (uploader claims, not ground truth)".
4. **Gemma optional** (ALIGNMENT.md §11): deferred; deterministic templates
   ship first (Phase 6).
5. **Xeno-canto public API returned HTTP 404 for every endpoint in this
   environment** — pivoted to Wikimedia Commons (approved source #2),
   licence-filtered, full provenance in `data/samples/manifest.json`.
6. **One Commons mp3 failed analyzer decode** (stereo 44.1 kHz, 129 s:
   "Cannot analyze audio file"). Backend must normalise audio
   (soundfile decode → mono 48 kHz WAV temp file) before calling the
   analyzer. Recorded honestly, not hidden.

## Phase 1 — Frontend skeleton (DONE)

- Vite 8 + React 19 + TS scaffold (`frontend/`), Tailwind v4 via
  `@tailwindcss/vite` with locked design tokens in `src/index.css`
  (`@theme`), lucide-react, framer-motion, DM Sans + Fraunces
  (`@fontsource`, self-hosted — no Google Fonts CDN).
- Full flow state machine in `App.tsx`:
  start → listen (record/sample) → analysing → results → mission →
  phone-away → done, plus journal & about overlays.
- Honest-by-construction components: `AnalysingPanel` (no fake progress
  bar), `ResultCard` ("model score", source-claim labels),
  `MissionPanel`/`PhoneAwayMode`, `Footer` (BirdNET attribution).
- `src/lib/api.ts` locks the backend contract (health, model-info,
  samples, analyze, mission) matching `src/lib/types.ts`.
- Verified: `npm run build` passes (13.02 s); `vite preview` served
  HTTP 200 on :4173.

## Phase 2 — Model spike (DONE, real inference)

- `scripts/smoke_test_model.py` uses official `analyze()` (min_conf 0.05,
  top_n 3, CSV). Results observed on this machine:
  - Model + species list load fine: **6,522 species**, 48 kHz, 3.0 s
    segments. (Upstream badge/marketing says "6K"/~6,512; the concrete
    shipped `BirdNET_GLOBAL_6K_V2.4_Labels.txt` has **6,522** non-empty
    lines. We publish the shipped count everywhere.)
  - Sine tone (execution check): analyzed in ~1.3–2.5 s CPU; on the final
    parse it produced "Buff-spotted Flufftail 0.6407" — a false positive
    on non-bird audio, kept as honest evidence that scores must not be
    over-trusted (UI shows low-confidence caveats).
  - Quirk: pip package `birdnet-analyzer==2.4.0` but
    `__version__` prints `"2.3.0"`.
- `MODEL_CARD.md` written with verified licences (code MIT, weights
  CC BY-NC-SA 4.0) and the actual observed outputs; no accuracy claims.

## Phase 3 — Sample acquisition (DONE)

- Xeno-canto API: HTTP 404 on all endpoints here → documented pivot to
  Wikimedia Commons MediaWiki API (`scripts/download_samples.py`).
- Fixed two real bugs during acquisition: (a) 429 throttling — compliant
  User-Agent with contact + stripping `?utm_*` params the API appends;
  (b) mangled file names from the same params (`Path(url).suffix` picked
  up `.org&utm_campaign=…`).
- Result: **5 samples** in `data/samples/` (gitignored), all CC BY-SA 4.0,
  full provenance + sha256 + audio checks in `data/samples/manifest.json`.
- Real smoke-test agreement — two levels, both kept on record:
  - **Production pipeline (normalised) — authoritative, the path the app
    runs.** Recorded 2026-10-11 via `scripts/record_sample_outputs.py`; the
    full verbatim top-3 outputs are committed in `data/model_outputs.json`.
    **5/5 top-1 agreement** with the uploader's claimed species: Indian Robin
    0.9994 · Red-whiskered Bulbul 0.6378 · Red-whiskered Bulbul 0.9611 ·
    Asian Koel 0.9748 · Asian Koel 0.9986. This is *source-label agreement*
    (uploader claims, NOT ground truth) on five curated clips — a metadata
    smoke test, not accuracy and not a field test.
  - **Raw analyzer (pre-normalisation), transcript `data/smoke_run.txt`:**
    Indian Robin ✅; Red-whiskered Bulbul ✅; Asian Koel ogg ✅; Asian Koel
    XC-mirror mp3 ❌ no reliable detection; Bulbul XC-mirror stereo mp3 ❌
    decode error → 3/5 agreement, 4/5 usable. Those two failures are exactly
    what the backend's audio-normalisation step fixes (covered by an
    integration test).
  - Taxonomy correction (P0.1): the manifest had listed the Red-whiskered
    Bulbul as *Pycnonotus cafer* (= Red-**vented** Bulbul, a different
    species). Corrected to *Pycnonotus jocosus*, matching the uploader's own
    source attribution. No model prediction was altered to manufacture a
    match.

## Phase 4 — FastAPI inference service (DONE)

- Structure per BUILD_PROMPTS §4: `backend/app/{main.py,schemas.py,
  core/config.py,services/{birdnet_service,audio_service,
  mission_service}.py}` + `backend/tests/`.
- Pipeline: validate ext (415) → size ≤25 MB (413) → soundfile decode
  (422 corrupt) → duration ≤60 s uploads / ≤300 s whitelisted samples
  (413) → silence check (422) → mono-normalised temp WAV → official
  `analyze()` → parse `*.BirdNET.results.csv` → per-species max
  aggregation → `AnalyzeResponse` matching `types.ts` one-to-one.
  Temp dirs cleaned in `finally`.
- Real HTTP evidence (uvicorn 127.0.0.1:8000, live server):
  - `GET /api/health` → `{"status":"ok","model_loaded":true,"model_ready":true}`
    (false before first inference — honest flag)
  - `GET /api/samples` → 5 entries from manifest
  - `POST /api/analyze?sample_id=WC_Asian_Koel_ogg.ogg` → status `ok`,
    rank 1 **Asian Koel model_score 0.9748**, rank 2 Pacific Koel 0.4207,
    rank 3 Helmeted Friarbird 0.183; `source_label` = "Asian Koel (source
    claim)"; `is_demo_fixture: false`
  - `POST /api/mission` → deterministic `watch-skyline` mission for
    "Asian Koel"; identical repeat request byte-for-byte identical
  - Temp-file check after all runs: 0 leftover `birdwalk_*` dirs in TEMP
- pytest: **23 unit tests pass** (contract shape, 400/404/413/415/422
  validation, traversal blocked, mission determinism/safety/aggregation
  logic) + **3 integration tests pass** with real inference, including
  the 20 s stereo slice that broke the raw analyzer in Phase 3 — the
  normalisation path now handles it (200 + predictions).
- One bug found and fixed via a failing test: `aggregate()` accepted
  `"None"` species rows (defense-in-depth filter added inside the
  function, not just at the CSV layer).
- CORS restricted to localhost dev origins; docs endpoints disabled.

## Phase 5 — Frontend ↔ backend integration (DONE, real E2E)

- Sample panel (5 entries from `/api/samples`) → click → real
  inference → results with source-claim note → mission → phone-away →
  journal (localStorage). Verified over HTTP in browser round 2:
  Indian Robin upload → model_score 0.9994; Asian Koel sample →
  0.9748. Zero console errors.
- Critical integration bug found by inspection: MediaRecorder emits
  webm/opus which libsndfile cannot decode. Fixed client-side:
  `frontend/src/lib/wav.ts` (decodeAudioData → OfflineAudioContext
  mono 48 kHz → PCM16 WAV) wired for the recording path in `App.tsx`.
- `.m4a` removed from backend allowed extensions (honest claim set);
  frontend upload cap aligned to backend's 25 MB.
- UI gaps from browser rounds, all fixed: missing source-claim note
  (ResultCard), timer-expiry re-showing the start button
  (PhoneAwayMode `elapsed` state), silent list collapse on empty
  search (India section empty state).

## Phase 6 — Deterministic mission engine (DONE)

- 7 curated templates (listen/stillness/watch/breathe/walk), chosen by
  `sha256(species)` — identical inputs → identical missions, no LLM,
  no network. Universal mission when detection is uncertain.
- `{species}` theming bounded to 60 chars; wording passes the
  parametrized safety test (no hazard verbs, negation-window check).
- Phone-away view hides the screen content behind a quiet timer with
  an explicit elapsed state (see Phase 5 fix).

## Phase 7 — Gemma grounding (CANCELLED — documented omission)

- Ollama binary exists on this machine but no running instance/model
  was available. Per the non-negotiable rule ("do not claim the app
  uses Gemma unless this integration actually works"), the optional
  generation layer is omitted and nowhere claimed. Missions are
  deterministic templates only.

## Phase 8 — India relevance via verified labels (DONE)

- `scripts/build_india_species_list.py`: 86 curated candidates (incl.
  deliberate controls: a non-bird, duplicate binomials, a misspelling)
  cross-checked by exact binomial against the shipped BirdNET V2.4
  label file (6,522 entries; format `Scientific name_Common name`,
  trinomials registered under full + first-two-word keys).
- Result: **69 verified / 14 rejected**, rejects kept in
  `backend/app/data/india_species.json` with reasons — the controls
  and taxonomy errors caught (e.g. *Spilopelia* vs *Streptopelia*)
  prove the verification actually runs. `backend/app/data/india_species.json`
  is label-presence verification only, never an accuracy/India-
  specialisation claim. No GPS.
- Backend `GET /api/india-species?q=` (≤50 results, `available:false`
  if not generated); frontend searchable list in About panel with
  200 ms debounce and honest empty state. Contract + search tests in
  the 26-test unit suite.

## Phase 9 — Full test pass (DONE)

- Final: **26 unit + 3 integration pytest green** (integration runs
  real inference, 18.1 s), `npm run build` green after the last
  accessibility fix (India-search focus indicator, WCAG 2.4.7 —
  found by browser round 3, fixed with `focus-within` outline).
- Negative path verified live: `scripts/check_negative_path.py`
  (synthetic birdless noise) → HTTP 200, status
  `no_reliable_detection`, strongest score 0.01. The five shipped
  samples all contain strongly detected birds once normalised, so
  the UI branch is covered by unit tests + this API-level probe.
- `TEST_REPORT.md` written with measured evidence only, incl. an
  explicit NOT TESTED section (mic on real device, airplane mode,
  Gemma, deployment, mobile browsers).

## Phase 10 — Polish, docs & ship checklist (DONE)

- Focus-indicator fix (Phase 9) re-verified live in the browser: label
  wrapping the India search computes `outline: solid 3px
  rgb(40,90,69)` while focused (≈7.96:1 contrast), none on blur;
  "drongo" search still filters; 0 console errors.
- `npm run build` re-run green after every fix (2.16 s).
- `README.md` written: problem, person, architecture, verified quick
  start, demo script, offline scope, limitations, licences/credits —
  every claim traceable to `TEST_REPORT.md` evidence or marked
  NOT TESTED.
- `THIRD_PARTY_NOTICES.md` written from **installed package metadata**
  (PyPI `License-Expression`, package.json `license`), not memory:
  BirdNET weights CC BY-NC-SA 4.0 (non-commercial warning prominent),
  analyzer MIT, TF Apache-2.0, all backend/frontend deps versioned,
  OFL fonts, per-file sample-audio credits.
- `LICENSE` (MIT) added for the project's own code, explicitly NOT
  granting rights over weights or audio.
- `.env.example` NOT added — the app uses no environment variables or
  secrets (BUILD_PROMPTS Phase 10: only if actually needed).
- Repository: `git init` performed (empty — **no commits made; that is
  the user's call**). `.gitignore` verified via
  `git status --porcelain -uall`: 93 publishable files; `.venv`,
  `node_modules`, sample audio, uvicorn runtime logs all excluded;
  manifest, sample README, evidence logs/screenshots and
  `data/smoke_run.txt` included.

### Status log

- [Phase 0] Repo + env inspected (commands above, real outputs).
  `IMPLEMENTATION_STATUS.md` created.
- [Phase 1] Frontend scaffolded, all components/hooks/lib written, build
  + preview verified (HTTP 200).
- [Phase 2] Backend venv created (`backend/.venv`, TF 2.21.0,
  birdnet-analyzer 2.4.0). V2.4 model + label assets downloaded for real
  (274.5 MB measured; SavedModel 58.4 MB — the earlier "224 MB" note was
  unverified and is corrected in the pre-submission audit).
  Smoke test ran real inference. `MODEL_CARD.md` written.
- [Phase 3] `scripts/download_samples.py` (Wikimedia Commons) → 5
  CC BY-SA 4.0 samples + `manifest.json` with provenance/checksums.
  Smoke test against real samples: 3/5 source-label matches, 1 honest
  negative, 1 analyzer decode failure (fixed in Phase 4 via audio
  normalisation — verified by integration test).
- [Phase 4] FastAPI service implemented + pytest suite green (23+3).
  Live uvicorn verified over HTTP with real inference, real mission
  response, temp-file cleanup, and honest error codes.
- [Phase 5] Frontend integrated with live backend; webm→WAV client-side
  fix; two browser E2E rounds green; source-claim & timer fixes shipped.
- [Phase 6] Mission engine + phone-away mode completed and tested.
- [Phase 7] Gemma omitted honestly (no running Ollama instance) — no
  claim made anywhere.
- [Phase 8] India shortlist: 69/86 candidates verified against real
  BirdNET labels; 14 rejects published with reasons; backend endpoint
  + frontend search UI + tests.
- [Phase 9] Full re-run green (26+3 unit/integration, build ✓);
  negative path probe live; `TEST_REPORT.md` written. Remaining for
  Phase 10: `README.md`, `THIRD_PARTY_NOTICES.md`, final polish sweep.
- [Phase 10] Focus fix browser-verified; README + THIRD_PARTY_NOTICES
  + LICENSE written from measured metadata; repo hygiene checked
  (git init, 93 publishable files, no secrets/venvs/audio); all
  checklist items green except explicitly-NOT-TESTED items. Build
  complete — honest ship state.
