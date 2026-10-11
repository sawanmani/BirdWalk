# I Built an AI That Identifies a Bird—and Then Tells You to Put Your Phone Away

*A Hacktoberfest 2026 "Touch Grass" submission write-up. Every number in
this post is reproducible from the repository; anything I could not verify
is labelled as such. This is not a claim that the project won anything —
it is an honest build story.*

---

## The problem is not "which bird is that?"

Here's a **hypothetical scenario** (I did not record a real field encounter
for this project — see the evidence notes below, because honesty is the
whole point):

> You're on a evening walk. Somewhere in a nearby tree a bird is running
> through a wild, fluting song. You pull out your phone, open an app, hold
> it up, wait… and the moment is gone. You got an answer, but you spent the
> experience looking *at* a screen instead of *up* at the tree.

Identification apps are great at the *label*. They are much worse at the
*habit*: they reward you for staying on the phone. The interesting design
constraint for a "Touch Grass" project is that the app's best feature should
be the part where it **gets out of the way**.

So I built **BirdWalk**: it listens to a short clip, runs a real bird-sound
classifier *on your own machine*, shows you one honest clue — and then hands
you a tiny, screen-free mission and goes quiet.

The goal is the **shortest** possible interaction: one clue, one mission,
phone back in your pocket.

## Why running the model *locally* matters

Bird identification is usually a cloud round-trip: you upload audio, some
server answers. For a "go outside and be present" app, that's backwards —
and it means your recording leaves your device.

BirdWalk runs inference against the **official BirdNET model on the local
backend host**. The practical consequences:

- **Your audio doesn't go to a third party.** Uploads are written to a
  temporary directory, analysed, and deleted in a `finally` block. There is
  no account, no database, and no GPS in this build.
- **It's the real model, not a lookup trick.** Inference uses
  `birdnet-analyzer`'s public `analyze()` API against the **BirdNET GLOBAL 6K
  V2.4** model — a TensorFlow classifier over **6,522 species labels** (the
  authoritative count of the shipped label file; upstream marketing rounds it
  to "~6K").
- **Local-first honesty.** I'm careful here: this means inference runs on the
  machine hosting the backend. I do **not** claim it runs natively on a phone
  in a pocket, and I have **not** yet run a full airplane-mode test (details
  below).

> **Licence note that shapes everything:** BirdNET's model weights are
> **CC BY-NC-SA 4.0** — *non-commercial*, attribution + share-alike. The
> analyzer *source code* is MIT. BirdWalk's own code is MIT, but that MIT
> licence deliberately does **not** relicense the weights or the sample audio.
> More on the tricky "does a contest prize make this commercial?" question at
> the end — I flag it, I don't hand-wave it.

## The architecture (the boring, dependable kind)

No new frameworks, no cloud AI API, no database — a small stack that does one
thing end-to-end.

```
Browser (Vite + React 19 + TypeScript + Tailwind v4)
   ├─ record (MediaRecorder → converted to mono 48 kHz WAV in-page)
   ├─ upload (.wav/.mp3/.ogg/.flac, ≤ 25 MB)
   └─ bundled, licence-cleared sample clips
            │  HTTP over localhost only
            ▼
FastAPI backend (Python, CPU — real inference)
   ├─ audio_service: validate → decode → normalise to mono WAV (temp, cleaned)
   ├─ birdnet_service: official BirdNET analyze() → per-species max → top 3
   ├─ mission_service: deterministic, safe missions (sha256-keyed templates)
   └─ /api/india-species: names verified against the model's own label list
            ▼
Results ("model score", never "accuracy") → mission → phone-away timer
   → local journal (localStorage, deletable)
```

The rendered version of this diagram is the `flowchart` in the repo
[`README.md`](https://github.com/sawanmani/BirdWalk).

Two engineering choices I'm proudest of, because they're about *trust*, not
flash:

1. **The model never calls anything "accuracy."** What comes out of the
   classifier is a `model_score`. A sine tone — pure non-bird test audio —
   once scored **0.64** for "Buff-spotted Flufftail" from the raw analyzer.
   That's a false positive I deliberately left in the record (MODEL_CARD.md),
   because it proves the number must be presented humbly. When the strongest
   score is below a 0.30 floor, the app reports `no_reliable_detection` —
   an honest "not sure," not a hidden guess.

2. **Missions are deterministic templates, not an LLM.** Same bird → same
   mission, byte-for-byte, with no network and no model. I did *not* wire up a
   local LLM (Gemma/Ollama) because none was actually running when I built it,
   and I'd rather ship something honest than fake a "smart" feature.

## The user journey

1. **Landing** — the header shows an *honest* readiness pill. After this
   project's audit it distinguishes "Local model ready" from "Service up —
   model weights not downloaded" from "Service up — BirdNET not installed" and
   "Local service unreachable." Import-installed ≠ usable-weights, and the UI
   now says so.
2. **Listen** — record, upload, or (easiest for a demo) tap a bundled sample.
3. **Analysing** — no fake progress bar pretending to know how long it'll
   take; real inference takes real, variable time on CPU.
4. **Results** — top species with `model_score`s and the uncertainty wording.
   For samples, the uploader's own label is shown clearly as a *source claim*.
5. **Mission** — a short, safe, screen-free prompt keyed to what you heard.
6. **Phone-away** — the screen goes minimal with a quiet timer. This is the
   point of the whole app.
7. **Journal** — a local, deletable log of what you noticed.

## What I actually verified (and what I didn't)

This is a **small, metadata-based smoke test**, not a benchmark. I have no
field-tested accuracy number and I won't pretend to.

**Automated tests, re-run 2026-10-11 on Windows / Python 3.12.3 /
TensorFlow 2.21.0 (CPU):**

- `36 passed` backend unit tests (contract shapes, validation paths,
  readiness honesty, offline honesty, the `no_reliable_detection` path,
  mission determinism, and metadata-consistency locks).
- `3 passed` integration tests with **real** BirdNET inference through the
  full HTTP pipeline, including the stereo clip that broke the raw analyzer.
- Frontend `npm run build` green (`tsc -b` + Vite).

**Sample outputs.** I record the model's literal top-3 on five bundled,
licence-cleared clips into a committed artifact,
[`data/model_outputs.json`](https://github.com/sawanmani/BirdWalk/blob/main/data/model_outputs.json),
generated with `scripts/record_sample_outputs.py`. On the production
(normalised) pipeline, the top prediction agreed with the uploader's claimed
species on all five:

| Clip (uploader's label = unverified claim) | Production top-1 | model_score |
|---|---|---|
| Indian Robin | Indian Robin | 0.9994 |
| Red-whiskered Bulbul (short WAV) | Red-whiskered Bulbul | 0.6378 |
| Red-whiskered Bulbul (XC mp3) | Red-whiskered Bulbul | 0.9611 |
| Asian Koel (OGG) | Asian Koel | 0.9748 |
| Asian Koel (XC mp3) | Asian Koel | 0.9986 |

Please read that table for exactly what it is: **5/5 *source-label
agreement* on five curated clips.** The labels are uploaders' own claims, not
ground truth, so this is *agreement*, **not** an accuracy measurement — and
five clips is a smoke test of the pipeline, not a field study. (For context,
the raw analyzer *without* the backend's audio normalisation only matched 3/5
and threw a decode error on one file — which is precisely why the backend
normalises audio before inference. Both numbers are kept in the record.)

**A taxonomy correction I made during the audit.** An earlier manifest listed
a "Red-whiskered Bulbul" sample with the scientific name *Pycnonotus cafer* —
but that's the **Red-vented** Bulbul, a different species. The correct name
for Red-whiskered is *Pycnonotus jocosus*, which is also what the uploader's
own source attribution said. I fixed the downloader and manifest to preserve
the uploader's label as an unverified claim — and, crucially, I did **not**
touch a single model prediction to manufacture a match. The model's *P.
jocosus* output is what it actually produced.

**What is NOT tested (stated plainly):**

- **Microphone recording on a real physical device.** The recording path and
  the in-page webm→WAV conversion are implemented and the conversion logic is
  unit-tested, but I did not run an end-to-end capture on real hardware (the
  automation here can't grant a microphone).
- **Airplane-mode / fully disconnected operation.** The analysis path makes no
  per-request network calls and serves the model from the local cache, which
  is a code-level fact I tested — but a genuine disconnected-OS run has **not**
  been performed, so `/api/model-info` reports `airplane_mode_verified: false`
  rather than implying it passed. The model itself (~275 MB of V2.4 assets on
  this install) downloads once on first use and is then cached locally.

## Screenshots & demo video

> _Placeholder — these will be real captures from a live local run, added
> before submission. Until then I'm deliberately not showing mockups._

- `![Landing & readiness — PENDING]` — landing screen with the honest status pill.
- `![Sample → results — PENDING]` — an Asian Koel sample and its model scores.
- `![Phone-away mission — PENDING]` — the minimal phone-away screen.
- `![Demo walkthrough video — PENDING]` — a ~60-second local run, no cuts to hide latency.

## The uncomfortable licence question

BirdNET weights are **non-commercial** (CC BY-NC-SA 4.0). Hacktoberfest is a
great fit *spiritually* — it's educational and non-monetised — but it can also
involve prizes and giveaways, and "non-commercial" under CC is a nuanced,
judgement-based term. **I'm not going to pretend I've legally resolved that,
and I'm not a lawyer.** The repo flags it explicitly in
`THIRD_PARTY_NOTICES.md` and the `LICENSE` note, and states the conservative
rule: BirdWalk's MIT licence covers *its own code only*, and anyone reusing
this commercially must remove the model or license it from the BirdNET team.
Attribution to the Cornell Lab of Ornithology & TU Chemnitz is surfaced in the
app's footer and About panel.

## Try it

```bash
# Backend (first run downloads the model once, then it's cached locally)
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev         # http://localhost:5173
```

Then click **Samples → Asian Koel** — the quickest way to see a real inference
result without a microphone.

**Repo:** https://github.com/sawanmani/BirdWalk

## The point

BirdWalk uses AI for the one part that's genuinely hard — turning a stranger's
song into a plausible name — and then throws that screen away so you can look
at an actual tree. The most important screen in the app is the one that asks
you to stop looking at screens.

I built it to be honest first and clever second: real local inference, real
recorded outputs, and a clear list of what I have *not* tested yet. If it gets
one person to put their phone down and listen, it did its job.

#devchallenge #hf26challenge #hacktoberfest

---

_Corrections welcome — this project's whole ethos is that the record should
match reality. If a claim here isn't backed by a committed test or artifact,
it shouldn't be in the post._
