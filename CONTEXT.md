# BirdWalk --- Project Context

## 1. One-line summary

BirdWalk is a calm, offline-first bird-sound exploration companion that
uses a pretrained local bird-audio model to show possible species
matches and then gives the user a short mission that encourages them to
put their phone away and observe nature.

## 2. Challenge alignment

The project is designed for the Hacktoberfest 2026 Open-Source AI
Challenge theme "Touch Grass". The central idea is that AI should
shorten the time spent on a screen and help the user engage with the
physical world. Do not imply contest endorsement or winning status.

## 3. Target person

Build for one believable person, not an abstract market. Suggested
framing: a family member who enjoys morning walks and hears birds but
does not know their names. Treat this as a product persona unless the
builder confirms it is a true personal story. Never fabricate a quote,
real relationship, interview, or user outcome.

## 4. Problem

People may hear birds in parks, gardens, or on walks without knowing
what they are hearing. A conventional app can invite prolonged screen
interaction. BirdWalk should help users get a useful clue quickly, then
transition them into a screen-free observation mission.

## 5. Product promise

"Listen to nature. Discover your world. Then put your phone away."

BirdWalk is not a scientific survey tool, a guaranteed species
identifier, or a substitute for expert verification. Model predictions
are possible matches and may be wrong, especially with background noise,
overlapping calls, poor microphones, or species outside the model's
reliable range.

## 6. Core user flow

1.  Open BirdWalk.
2.  Record a short sound, upload an audio file, or try a licensed
    sample.
3.  Run actual BirdNET inference locally on the backend host.
4.  Show the top predictions with model scores and uncertainty.
5.  Offer one safe, short, screen-free nature mission.
6.  Let the user complete the mission and optionally save a local
    session record.

## 7. Technical architecture

-   Frontend: React + TypeScript + Vite.
-   Styling: Tailwind CSS with a small token system.
-   Icons: Lucide React.
-   Motion: Framer Motion, restrained and reduced-motion aware.
-   Backend: Python 3.11 + FastAPI + Uvicorn.
-   ML: a documented BirdNET model/package route, selected after
    checking exact licence and installation requirements.
-   Audio: browser MediaRecorder and file upload; backend validation and
    resampling to the model's exact expected format.
-   Local history: browser localStorage only; no account or database in
    the MVP.
-   Optional future integration: local Gemma via Ollama to generate
    missions, only after the core BirdNET path works. Deterministic
    mission templates remain the fallback.

## 8. Model and licence caution

BirdNET v2.4 model distributions are not automatically unrestricted. The
example distribution `tphakala/BirdNET-v2.4` declares CC BY-NC-SA 4.0,
including attribution, non-commercial and share-alike conditions. Check
the exact package/model version used, retain required attribution, and
do not claim commercial-use rights. The model's number of output classes
is not the same as accuracy. Do not claim India-specific accuracy
without a suitable evaluation.

## 9. Online sample audio policy

The builder cannot personally record audio during the initial build. The
implementation agent should create a reproducible script that downloads
a small set of individual recordings from reputable sources such as
Xeno-canto or Wikimedia Commons only when their individual licences
allow the intended use. For each sample, record the source page,
creator, licence, attribution, date downloaded and checksum. Do not
scrape arbitrary sites or assume all recordings are free to reuse.

Online clips can verify that the pipeline runs. If a source page
supplies a species label, matching it is only a metadata-based smoke
test, not independent ground truth or a real field test. Do not report a
real-world accuracy percentage from a tiny curated set. No personal
field test should be claimed unless one actually happened.

## 10. Offline claims

"Offline" must be scoped. Local model inference may work without a
network once the model and required assets are downloaded. Downloading
samples, remote fonts, deployment, external descriptions or model
acquisition may still require internet. Verify
airplane-mode/network-disconnected behaviour and document precisely what
works. Do not claim phone-native inference when the backend is running
on a laptop or hosted server.

## 11. Privacy and safety

-   Do not retain uploaded audio by default.
-   Use temporary files and clean them up.
-   Do not send audio to a closed AI API.
-   Do not request GPS permission in the MVP.
-   Avoid logging personal data or audio.
-   Never encourage users to feed, touch, chase, disturb, or lure
    wildlife.
-   Do not play bird calls to attract wildlife.
-   Provide an accessible mission alternative for people who cannot walk
    or hear clearly.
-   Do not treat predictions as certain.

## 12. What success means

For the same-day MVP, success means: - The app runs. - Real pretrained
inference works on at least one legally usable sample. - Browser
recording or upload is connected to the model. - Results and errors are
honest. - The mission flow is polished and works without a generative
model. - Model and sample credits are documented. - Tests are
reproducible. - Any field-test, accuracy, offline, or device claims are
backed by actual evidence.

## 13. Out of scope

Accounts, social features, maps, GPS tracking, leaderboard, payments,
training from scratch, phone-native inference claims, cloud AI
inference, conservation-grade claims, and mandatory Gemma dependency are
excluded from the initial MVP.

## 14. Story guidance for the submission

A strong write-up should describe a specific person and scene, the
limitation of the existing experience, the design choice to stop the
user from scrolling, how local/open model use matters, what was tested,
what failed, and what remains unproven. Use a real personal story only
if it is true. Do not invent metrics, interviews, field tests or
screenshots.
