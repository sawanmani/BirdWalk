# BirdWalk --- Agent Skills and Engineering Playbook

This file defines how the vibe-coding agent should work. The agent
should behave like a careful senior engineer who ships a small, complete
product.

## Skill 1: Repository reconnaissance

-   Inspect existing files before creating or overwriting anything.
-   Identify OS, Node, npm, Python and pip versions.
-   Keep changes incremental and easy to inspect.
-   Maintain `IMPLEMENTATION_STATUS.md` with completed, in-progress,
    blocked and untested items.
-   Never claim a command passed unless it was run and its output
    checked.

## Skill 2: Frontend engineering

-   Use React + TypeScript + Vite.
-   Use Tailwind CSS and shared design tokens.
-   Build small reusable components with clear props.
-   Keep state management simple for the MVP; use React state and small
    hooks rather than adding Redux.
-   Avoid unnecessary routing libraries, component libraries, databases
    or build tools.
-   Make recording, upload, sample selection, result display, mission
    completion and history functional.
-   Use proper loading, empty, success, no-detection and error states.
-   Use `AbortController` for cancellable requests where practical.
-   Handle microphone permissions and MediaRecorder capability
    detection.
-   Do not make frontend fixtures look like real model output.

## Skill 3: Visual design

-   Follow the "field journal meets premium nature-tech" visual
    direction in `BUILD_PROMPTS.md`.
-   Build mobile-first and test at narrow widths.
-   Use forest green, warm paper, sage and restrained sunlit accents.
-   Prefer clear composition, typography, whitespace, tactile cards and
    subtle natural motion.
-   Avoid generic AI SaaS templates, excessive gradients, excessive
    blur, dense analytics dashboards and decorative controls.
-   Use accessible contrast, visible focus, semantic controls,
    reduced-motion support and large touch targets.
-   Keep the "Phone away" view intentionally quiet.
-   Use actual image assets only when their source and licence are
    documented; do not hotlink random image search results.

## Skill 4: Python and API engineering

-   Use Python 3.11 and FastAPI.
-   Keep routes thin; put audio/model logic in service modules.
-   Define request/response schemas and useful error responses.
-   Validate file size, duration, MIME type and decode success.
-   Treat file extensions and client-provided MIME types as untrusted.
-   Use temporary files and delete them in `finally` blocks.
-   Do not log uploaded audio or sensitive metadata.
-   Keep CORS restricted to the local development frontend origin.
-   Do not expose arbitrary file paths or shell execution through the
    API.

## Skill 5: ML integration

-   Prefer documented BirdNET ecosystem installation/inference paths.
-   Verify the exact package, model version, input sample rate, required
    clip length, label mapping and licence.
-   Load the model once per backend process when feasible; do not reload
    it for every request.
-   Keep the preprocessing pipeline explicit and testable.
-   Do not assume every BirdNET distribution has identical output shape
    or preprocessing.
-   Do not convert scores to percentages and call them accuracy.
-   Return top-k predictions and a cautious explanation.
-   Handle low scores or ambiguous output without claiming certainty.
-   Never replace failed inference with random species names.

## Skill 6: Online audio download and verification

-   Prefer sources such as Xeno-canto and Wikimedia Commons, checking
    the licence on the individual recording page.
-   Respect source terms, rate limits and attribution requirements.
-   Use HTTP timeouts, retries with limits, content-length/size caps and
    safe filenames.
-   Do not bypass login, paywalls, access controls or anti-bot systems.
-   Record source URL, creator, licence, attribution, retrieval date,
    checksum and label provenance in a manifest.
-   Verify response status, file size, file decoding, duration,
    channels, sample rate and non-empty waveform.
-   If a source's licence is unclear or unsuitable, skip it.
-   Source labels are not independently verified ground truth. Treat
    online samples as smoke tests unless independently reviewed.
-   Do not claim field testing when using downloaded sample clips.

## Skill 7: Mission generation

-   Implement deterministic templates before optional LLM generation.
-   Missions should be short, safe, accessible and screen-minimizing.
-   Do not advise users to approach, touch, feed, chase or lure birds.
-   Provide a mission that still works when the model is uncertain.
-   Store mission completion locally and allow deletion.
-   If Gemma is added, use structured input, schema-validated output,
    timeouts and deterministic fallback.
-   Never make the app unusable if Gemma/Ollama is missing.

## Skill 8: Testing and evidence

-   Backend: pytest for health, validation, malformed audio, response
    shape and service errors.
-   Frontend: build and test the primary flow and error states.
-   Test a real model inference with a real audio file.
-   Test unsupported audio and backend-down states.
-   Verify mobile responsiveness and keyboard interaction.
-   Test network-disconnected inference only after downloading all
    required model assets.
-   Record date, environment, commands, outputs, limitations and
    failures.
-   Separate model smoke tests, source-label agreement, field tests and
    proper accuracy evaluations.
-   Never fabricate screenshots, test outputs, numbers or deployment
    links.

## Skill 9: Documentation

Keep these files accurate: - `README.md`: what it does, architecture,
setup, demo, limitations. - `MODEL_CARD.md`: model/version, source,
licence, expected input, output, limitations. -
`THIRD_PARTY_NOTICES.md`: model and asset credits. - `TEST_REPORT.md`:
commands, environment, pass/fail and evidence. -
`IMPLEMENTATION_STATUS.md`: current implementation and blockers. -
`data/samples/manifest.json`: audio provenance. - `CONTEXT.md`: product
background. - `ALIGNMENT.md`: claims and acceptance contract.

## Skill 10: Git hygiene and shipping

-   Use a `.gitignore` for virtual environments, `node_modules`, caches,
    local recordings, model weights, secrets and build output.
-   Do not commit large model weights or audio samples unless their
    licence, size and repository policy allow it.
-   Never commit `.env` secrets.
-   Provide `.env.example` only when environment variables are needed.
-   Keep install/run commands reproducible.
-   Run frontend build and backend tests before calling the project
    ready.
-   If deployment fails, report it clearly and provide the local run
    path.
-   Use small, descriptive commits if Git is configured; never overwrite
    user work without checking.

## Skill 11: Communication

-   Give concise progress updates after meaningful milestones.
-   Report actual blockers early.
-   Do not repeatedly ask the user to decide technical details already
    fixed in the documents.
-   When a trade-off is needed, choose the simplest path that preserves
    truthful claims and working inference.
-   Mark unfinished items explicitly rather than hiding them.

## Skill 12: Final ship checklist

Before saying "done," verify: 1. Frontend starts and builds. 2. Backend
starts. 3. Real BirdNET inference works. 4. End-to-end
record/upload/sample flow works. 5. Mission flow works without an LLM.
6. Audio credits and model attribution are present. 7. Licence is
documented. 8. Offline claims are scoped to tested behaviour. 9. README
contains no fabricated numbers. 10. Test report records actual outcomes.
11. The UI is responsive and accessible. 12. Optional Gemma integration
is either tested or omitted honestly.
