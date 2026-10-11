# BirdWalk --- Phase-by-Phase Vibe-Coding Build Prompts

**Project:** BirdWalk\
**Tagline:** Listen to nature. Discover your world. Then put your phone
away.\
**Challenge:** Hacktoberfest 2026 Open-Source AI Challenge --- "Touch
Grass"\
**Purpose:** A reliable, beautiful, offline-first bird-sound exploration
web app.\
**Audience:** A family member who enjoys morning walks and hears birds
but cannot identify them. Keep this human story configurable; do not
claim a real personal story unless it is true.

------------------------------------------------------------------------

## 0. Non-negotiable instructions for the coding agent

You are the senior full-stack engineer, UI/UX designer, ML integration
engineer, QA engineer, and documentation writer for this project. Build
a working product, not a mockup.

### Locked stack

-   Frontend: **React + TypeScript + Vite**
-   Styling: **Tailwind CSS** with CSS variables/design tokens
-   UI icons: **Lucide React**
-   Motion: **Framer Motion** only for restrained, purposeful
    transitions
-   Backend: **Python 3.11 + FastAPI + Uvicorn**
-   Model integration: **BirdNET pretrained model through the official
    BirdNET ecosystem or a documented compatible local inference
    package**
-   Audio upload/processing: Python `soundfile`/`librosa` only where
    necessary; avoid unnecessary heavy dependencies
-   Tests: **Pytest** for backend; **Vitest + React Testing Library**
    for frontend if time allows
-   Package managers: npm for frontend, pip/venv for backend
-   Do not switch frameworks, introduce Next.js, add a database, or add
    a cloud AI API unless the user explicitly approves.

### Product principles

1.  Core bird identification should run locally on the machine hosting
    the backend after model/assets are downloaded.
2.  The frontend may run on a phone, but do **not** claim inference runs
    on the phone unless on-device inference is actually implemented and
    tested.
3.  Online bird recordings may be downloaded for development smoke tests
    and demo fixtures. They are **not** proof of real-world field
    accuracy.
4.  Do not invent accuracy, confidence, testing, users, field visits, or
    offline results.
5.  Never silently label a model score as calibrated probability. Call
    it "model score" unless calibration is verified.
6.  Show the correct model attribution and licence. The commonly
    referenced BirdNET v2.4 model distribution at
    `tphakala/BirdNET-v2.4` is labelled **CC BY-NC-SA 4.0**; this is
    non-commercial and share-alike. Verify the exact weights/package
    selected before use and do not imply unrestricted commercial use.
7.  Do not train a model from scratch.
8.  Do not send recordings to a proprietary API. No OpenAI/closed cloud
    inference.
9.  No API keys should be required for the core experience.
10. Keep scope tight. A reliable end-to-end flow beats many incomplete
    features.

### Mandatory first action

Before writing application code: - Inspect the current repository and
preserve useful existing work. - Report detected files and
environment. - Check installed Node/Python versions. - Write a short
implementation plan and list any actual blockers. - Do not ask the user
questions for details already specified in this document. - If a
package/model install fails, diagnose it and try a documented compatible
route; do not replace the model with a fake classifier.

------------------------------------------------------------------------

## 1. Product definition

BirdWalk helps people recognize possible bird calls and then encourages
them to observe nature without staring at their screens.

### Core user journey

1.  User opens a calm, premium, nature-inspired landing page.
2.  User chooses **Record a sound** or **Try a sample recording**.
3.  Recording is captured in the browser, or a bundled/licensed sample
    is selected.
4.  Audio is sent to the local FastAPI service.
5.  The backend validates the audio, converts it to the input format
    required by the chosen BirdNET inference route, and runs actual
    model inference.
6.  Results show up to three predictions with model scores, clear
    uncertainty language, and species names.
7.  User gets one short outdoor mission based on the result.
8.  The mission screen explicitly invites them to put the phone away.
9.  User may mark the mission complete and see a locally stored session
    history.

### MVP features

-   Responsive landing/dashboard
-   Record audio (browser MediaRecorder, with permission and error
    handling)
-   Upload an audio file
-   "Try a sample" flow using legally reusable, attributed sample
    recordings
-   Real BirdNET inference when model setup is available
-   Results with top predictions and model scores
-   Clear "uncertain / no reliable detection" state
-   Nature mission card, selected from a deterministic local template
    system
-   Screen-free timer / mission completion
-   Local-only history using localStorage
-   Offline status indicator and an honest explanation of what is / is
    not offline
-   Model attribution, licence and sample credits
-   Loading, empty, permission-denied, backend-unavailable,
    unsupported-file and inference-error states
-   README with setup, limitations, licence notes and test evidence

### Explicitly out of scope for the same-day MVP

-   User accounts, social feed, leaderboards, maps, GPS tracking,
    payments
-   Training/fine-tuning a bird model
-   Claiming phone-native inference
-   Building an Android app
-   Gemma/Ollama integration unless the BirdNET end-to-end flow is
    already working and there is real time left
-   Medical, conservation-grade or scientific claims
-   Automatically asserting a bird species is present based on location
    alone

------------------------------------------------------------------------

## 2. UI/UX direction --- make it exceptional

### Visual concept: "field journal meets premium nature-tech"

The interface should feel calm, tactile, warm, confident and
outdoorsy---not like a generic AI dashboard.

### Design tokens

Use a cohesive palette through CSS variables: - Deep forest: `#173D32` -
Pine: `#285A45` - Moss: `#78936B` - Warm paper: `#F5F1E7` - Pale sage:
`#E5EBDD` - Sunlit yellow: `#E8BD62` - Ink: `#1E2924` - Muted text:
`#68746C` - Error: `#B5473C`

Keep contrast accessible. Do not use low-contrast sage text on cream
backgrounds.

### Typography

-   Use **DM Sans** or **Inter** for interface text.
-   Use **Fraunces** or **DM Serif Display** sparingly for editorial
    headlines.
-   Use fluid type sizes with `clamp()`.
-   If web fonts fail offline, system fonts must remain attractive.

### Layout and composition

-   Mobile-first, excellent at 360px width and up.
-   Desktop content max width around 1200px.
-   Use generous whitespace, strong type hierarchy, large rounded cards
    (16--24px), subtle borders and natural shadows.
-   Use a clear primary CTA and a secondary "Try a sample" action.
-   Avoid dense dashboards, excessive gradients, excessive
    glassmorphism, emoji-only icons, and stock AI-template appearance.
-   Use real, legally usable nature imagery only where it adds value;
    otherwise create elegant CSS/SVG botanical accents.
-   Add a subtle animated waveform / leaf motion, but respect
    `prefers-reduced-motion`.
-   Motion should guide attention and never delay the task.

### Required screens/states

1.  **Landing / Start**
    -   Brand wordmark "BirdWalk"
    -   Headline: "Hear the birds. Find your way back to the world."
    -   Supporting copy explaining local-first identification and
        screen-free missions
    -   Primary CTA: "Listen to a bird"
    -   Secondary CTA: "Explore a sample"
    -   Small privacy badge: "Your recording stays on this machine
        during local inference" only when the actual architecture
        supports it; otherwise state the actual data path.
    -   Tiny "Powered by BirdNET" attribution visible in an
        About/credits area and near results.
2.  **Listening / Recording**
    -   Large circular record button with clear recording state
    -   Timer, waveform visualisation, cancel/stop controls
    -   Instructions: "Capture a few seconds of nearby sound. Keep a
        respectful distance from wildlife."
    -   Explain microphone permission before requesting it
    -   File upload alternative
    -   Sample recording alternative
    -   Friendly unsupported-browser and permission-denied states
3.  **Analysing**
    -   Short, non-deceptive progress states: "Preparing audio",
        "Running local model", "Preparing your mission"
    -   Do not show fake percentage progress if actual progress is
        unavailable
    -   Cancel/retry where practical
4.  **Results**
    -   Editorial "What we heard" heading
    -   Top prediction prominent, next predictions secondary
    -   Show common name, scientific name if available, and "Model
        score" (not "accuracy")
    -   Use confidence language such as "Possible match" and "Other
        possibilities"
    -   Explain that overlapping calls, distance, wind and recording
        quality can affect results
    -   If no credible result: say so plainly; never fabricate a species
    -   CTA: "Give me a nature mission"
5.  **Mission**
    -   One clear, low-screen-time instruction
    -   Large type, one mission at a time
    -   Example: "Pocket your phone. For two minutes, listen for a
        second bird call and notice which direction it comes from."
    -   Start / finish controls and optional timer
    -   A "Phone away" state with very little UI and no distracting
        animations
    -   Completion confirmation should be satisfying but restrained
6.  **History**
    -   Locally stored sessions only
    -   Show date, prediction, mission and completion state
    -   Clear all history action with confirmation
    -   No fake data in production; demo seed data must be clearly
        labelled
7.  **About / Open AI / Credits**
    -   Explain why local inference matters: privacy, offline potential,
        replaceability and avoiding per-call cloud costs
    -   Explain actual limitations and licence
    -   Credit BirdNET and each sample-audio source with source URL,
        creator, licence and modifications
    -   Do not call BirdNET "fully open source" without explaining the
        exact model/package licence. Prefer "pretrained model with
        locally runnable inference" and precise licence wording.

### Accessibility

-   Semantic HTML and keyboard navigation
-   Visible focus styles
-   Label all controls
-   Do not communicate status by colour alone
-   `aria-live` for recording/inference state updates
-   Respect reduced motion
-   Maintain readable contrast and tap targets around 44px
-   Audio is never auto-played unexpectedly

------------------------------------------------------------------------

## 3. Phase-by-phase implementation prompts

Use each phase as a separate instruction to the vibe-coding agent. Do
not skip verification gates.

### PHASE 0 --- Repository audit and implementation plan

**Prompt to agent:**

"You are taking ownership of BirdWalk. Read `CONTEXT.md`,
`ALIGNMENT.md`, and `SKILLS.md` first. Inspect the repository before
changing anything. Confirm the stack is React + TypeScript + Vite,
Tailwind, FastAPI/Python 3.11, BirdNET local inference. Report the
repository structure, installed runtime versions, and the smallest
reliable route to a working end-to-end demo. Do not ask me to choose a
framework. Do not fabricate capabilities. Create a concise checklist in
`IMPLEMENTATION_STATUS.md` with acceptance criteria and risks. Then
begin implementation."

**Gate:** No code changes that conflict with the locked stack. Existing
useful files are preserved.

### PHASE 1 --- App skeleton and premium UI system

**Prompt to agent:**

"Build the React + TypeScript + Vite application shell and Tailwind
design system exactly as defined in `BUILD_PROMPTS.md`. Create reusable
components for AppShell, Header, Hero, PrimaryButton, RecordingPanel,
ResultCard, MissionCard, StatusBanner, EmptyState, ErrorState and
Footer/Credits. Implement responsive layouts and all essential
routes/views as a simple state-driven single-page flow; do not add
routing dependencies unless needed. The UI must look like a polished
nature field journal, not a generic admin dashboard. Add the colour
tokens, typography, accessible focus states, reduced-motion handling and
mobile layout. Use real working controls; no decorative buttons that do
nothing. Until inference is integrated, use an explicitly labelled
development fixture only behind a clear `DEMO_FIXTURE_MODE` flag. Never
make fixture results look like real inference."

**Gate:** App starts with `npm run dev`; responsive UI works; no
TypeScript errors; core actions have meaningful behaviour or a clear
disabled state.

### PHASE 2 --- BirdNET model and audio pipeline spike

**Prompt to agent:**

"Before building more UI, prove real model inference in a small backend
test. Use a documented BirdNET package/model route compatible with
Python 3.11 and the project's licence constraints. Prefer a maintained
official BirdNET ecosystem package when feasible. If using a specific
Hugging Face model distribution, inspect its model card and LICENSE and
record exact model/version, download source, hash if practical,
attribution, limitations and licence in `MODEL_CARD.md`. The commonly
referenced `tphakala/BirdNET-v2.4` distribution is CC BY-NC-SA 4.0; do
not assume it permits commercial use. Do not download arbitrary
executable/model files from untrusted sources. Implement a tiny script
that loads one audio file, runs inference, and prints actual top
predictions. If installation fails, diagnose the error and try the
documented alternative. Do not fake inference with random labels."

**Gate:** A command-line smoke test loads the real model and produces
output from a known audio file. Record exact command and result in
`IMPLEMENTATION_STATUS.md`.

### PHASE 3 --- Online sample audio acquisition with licensing and verification

**Prompt to agent:**

"I cannot personally record bird audio today. Create a safe sample-audio
acquisition workflow that downloads a small set of publicly accessible
bird recordings from reputable sources such as Xeno-canto or Wikimedia
Commons, only where the individual recording's licence permits our
intended demo/repository use. Do not scrape random websites, bypass
access controls, or assume every recording is reusable. Prefer
permissively licensed recordings; if a recording has
non-commercial/share-alike restrictions, document them and ensure the
overall use complies. For each sample, save a sidecar entry in
`data/samples/manifest.json` with species label, source page URL, direct
file URL where permitted, creator, licence, attribution text, download
date, original filename, file checksum, and whether label metadata was
independently verified. Keep audio files out of Git if their licence or
size makes redistribution unsuitable; provide a script that downloads
them on demand instead."

"After download, verify each file technically: successful HTTP status,
non-zero size, file decodes, duration, sample rate/channels, no
corrupt/truncated audio, and expected audio format. Then run BirdNET and
save raw top-k predictions and model scores to a test report. Compare
predictions against the source's stated identification only as a
**metadata-based smoke test**, not independent ground truth. Do not
claim these clips are field tests or calculate a general real-world
accuracy claim from a small curated sample set. Clearly distinguish
source-label agreement from validated accuracy."

**Gate:** At least 3 legally usable sample recordings are available via
the reproducible script, or the agent reports the blocker honestly and
uses a clearly marked synthetic/test fixture only for UI tests. Never
fake bird audio.

### PHASE 4 --- FastAPI inference service

**Prompt to agent:**

"Create a FastAPI backend with `GET /api/health`, `GET /api/model-info`,
and `POST /api/analyze`. `POST /api/analyze` accepts one audio file,
validates file type and size, limits duration, decodes safely,
converts/resamples to the exact format expected by the selected BirdNET
inference route, and returns the actual top-k predictions. Use a
consistent response schema: `species_common_name`,
`species_scientific_name` when available, `model_score`, `rank`, and
explanatory metadata. Do not rename a score to calibrated probability.
Add clear errors for missing model, unsupported/corrupt audio, excessive
duration, invalid sample rate, and inference failure. Never write
uploaded audio permanently by default; use temporary files and clean
them up. Avoid logging raw audio, coordinates, or personal data. Enable
CORS only for the local frontend origin in development. Add pytest tests
for validation and API response structure."

**Gate:** Health endpoint works; real audio request returns actual model
output; malformed inputs return useful HTTP errors; temporary audio
files are cleaned up.

### PHASE 5 --- Frontend audio recording and backend integration

**Prompt to agent:**

"Connect the React UI to the FastAPI service. Use `MediaRecorder` with
browser capability checks, microphone permission handling, stop/cancel
controls, recording duration limits and clear permission-denied
messaging. Add audio-file upload and 'Try a sample' paths. For sample
playback, never auto-play. Send audio to `/api/analyze`, display real
top-k output and distinguish model scores from accuracy. Handle loading,
backend offline, model unavailable, upload too large, unsupported
format, invalid audio and no reliable detection. Remove all placeholder
predictions from normal production paths. Add a development-only fixture
mode that is visibly labelled and cannot be mistaken for real
inference."

**Gate:** End-to-end path works: record/upload/sample → backend → actual
model → results. A failure must produce an error state, not a fake
result.

### PHASE 6 --- Nature mission engine (deterministic first)

**Prompt to agent:**

"Implement a deterministic mission generator first so the core product
works without any generative model or network access. Create a curated
set of safe, accessible, short missions with category, duration,
instructions and accessibility alternatives. Select a mission based on
observation context without asserting the predicted bird is definitely
present. Missions must not encourage approaching, feeding, touching,
disturbing or playing bird calls to attract wildlife. Include a
universal mission that works even if identification fails. Add a
low-distraction 'Phone away' view, optional screen-free timer,
completion control and locally stored completion history. The app must
not require Gemma or Ollama to function."

**Gate:** Mission flow works offline once app assets/backend/model are
available; mission wording is safe, concise and screen-minimizing.

### PHASE 7 --- Optional Gemma category integration (only after MVP is stable)

**Prompt to agent:**

"Only attempt this phase if Phases 2--6 pass and there is sufficient
time. Add optional Gemma-generated mission text through a local Ollama
runtime, with a deterministic fallback. Do not make the core app depend
on Gemma being installed. Verify the exact Gemma model name, local
runtime requirements, hardware feasibility and licence before
integration. The model receives only structured, non-sensitive context
such as the predicted label, confidence band, mission duration and
user-selected difficulty; do not send audio or precise location.
Constrain output to a short JSON schema and validate it. If Ollama/model
is unavailable, timeout occurs, or output fails validation, use
deterministic mission templates. Do not claim the app uses Gemma unless
this integration actually works and is shown in the repository/demo."

**Gate:** App remains fully usable without Gemma. If optional
integration cannot be completed, document it as future work and do not
enter the Gemma category.

### PHASE 8 --- India relevance without unsupported claims

**Prompt to agent:**

"Add an optional India-focused experience only where supported by the
model's actual label list and evidence. Build a searchable local list of
India-relevant species from a reputable source and cross-check that each
common/scientific name exists in the selected BirdNET labels. Do not
claim that BirdNET is India-specialized or that the model has superior
Indian accuracy unless supported by evidence. Do not use GPS by default.
If location filtering is added, make it optional, explain why it is
used, and do not store precise coordinates. Show 'possible match'
language and include a 'not sure' path."

**Gate:** Species filter uses verified labels; no fabricated regional
performance claims.

### PHASE 9 --- Testing, offline checks and honest evidence

**Prompt to agent:**

"Run a complete verification pass. Test frontend build, backend tests,
health endpoint, one valid sample, one invalid file, no model installed,
backend down, microphone denied, and mobile viewport. Test offline
behaviour separately: after model and assets are already downloaded,
disconnect network and verify which features continue to work. Do not
claim the entire product is offline if fonts, sample downloads, or other
features require internet. Save reproducible results in `TEST_REPORT.md`
including date, environment, commands, pass/fail, model version and
limitations. Use only real measured outputs. If no outdoor recordings
were personally collected, explicitly say that no personal field test
was conducted; online sample clips are development smoke tests, not
field validation."

**Gate:** No invented tests or metrics. Every claim in README is
supported by a test or marked as a design goal.

### PHASE 10 --- Polish, deployment and submission assets

**Prompt to agent:**

"Polish the product without adding scope. Check spacing, responsive
behaviour, keyboard accessibility, error states, loading states, empty
states, contrast, reduced motion and console output. Ensure
`npm run build` passes and backend instructions are reproducible. Add
`.env.example` only if environment variables are actually needed; never
commit secrets. Prepare a README with problem, target person, solution,
architecture, how to run, model attribution/licence, sample-audio
credits, offline test scope, limitations, test report and
screenshots/demo instructions. Add a clear `Powered by BirdNET` credit
where required by the selected model licence. Do not claim deployment
succeeded until the public URL has been tested. Do not claim Gemma
category eligibility unless the Gemma integration genuinely works."

**Gate:** Fresh-clone setup instructions work; all claims are accurate;
repository is ready to publish.

------------------------------------------------------------------------

## 4. Suggested repository structure

``` text
birdwalk/
├── README.md
├── BUILD_PROMPTS.md
├── CONTEXT.md
├── ALIGNMENT.md
├── SKILLS.md
├── IMPLEMENTATION_STATUS.md
├── MODEL_CARD.md
├── TEST_REPORT.md
├── THIRD_PARTY_NOTICES.md
├── .gitignore
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── lib/
│       ├── styles/
│       └── main.tsx
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── schemas.py
│   │   ├── services/
│   │   │   ├── birdnet_service.py
│   │   │   ├── audio_service.py
│   │   │   └── mission_service.py
│   │   └── core/
│   └── tests/
├── scripts/
│   ├── download_samples.py
│   └── smoke_test_model.py
└── data/
    ├── samples/
    │   ├── manifest.json
    │   └── README.md
    └── reports/
```

The agent may adapt file placement if the existing repository already
has a coherent structure, but must not change the locked framework
stack.

------------------------------------------------------------------------

## 5. Acceptance checklist

-   [ ] React + TypeScript + Vite frontend starts and builds.
-   [ ] FastAPI backend starts and health endpoint responds.
-   [ ] Actual pretrained BirdNET model loads.
-   [ ] At least one legally usable online sample audio runs through
    real inference.
-   [ ] Browser recording or upload reaches backend and returns real
    output.
-   [ ] Prediction scores are not misrepresented as accuracy.
-   [ ] Unknown/low-quality audio does not produce fabricated certainty.
-   [ ] Missions work without a generative model.
-   [ ] UI is responsive, accessible and nature-themed.
-   [ ] Audio is not retained or uploaded to a third-party service by
    default.
-   [ ] Model and sample licences/attributions are documented.
-   [ ] Offline claims are limited to features actually tested offline.
-   [ ] README and test report contain no invented field test or
    accuracy claims.
-   [ ] Optional Gemma integration is either genuinely working or
    clearly omitted.
-   [ ] All buttons work or are clearly disabled with an explanation.

------------------------------------------------------------------------

## 6. References to verify during implementation

-   BirdNET Analyzer: https://github.com/birdnet-team/BirdNET-Analyzer
-   BirdNET Analyzer docs:
    https://birdnet-team.github.io/BirdNET-Analyzer/stable/
-   BirdNET v2.4 model card and licence example:
    https://huggingface.co/tphakala/BirdNET-v2.4
-   Xeno-canto: https://xeno-canto.org/
-   Wikimedia Commons: https://commons.wikimedia.org/
-   Gemma documentation (optional): https://ai.google.dev/gemma/docs

Always inspect the exact version, model card and licence before
downloading or redistributing weights/audio.
