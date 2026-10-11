# BirdWalk Explorer League — Repository Implementation Blueprint

> **Purpose:** Give a coding agent a repository-aware, test-driven plan to add a birdwatching collection and responsible gamification system to the existing BirdWalk project without breaking its current local/offline bird-identification workflow.
>
> **Repository:** https://github.com/sawanmani/BirdWalk.git  
> **Suggested file location:** `docs/BIRDWALK_EXPLORER_LEAGUE_IMPLEMENTATION.md` (or repository root if the agent confirms that is the project's established convention).
>
> **Important:** This document is an implementation brief, not evidence that the listed files, frameworks, routes, or database systems already exist. The agent MUST inspect the real repository and adapt all changes to its actual architecture.

---

## 1. Mission and product vision

Implement **BirdWalk Explorer League**: an optional birdwatching collection and community layer built around BirdWalk's existing bird-identification experience.

**Product tagline:** *Discover Birds. Build Your Collection. Touch Grass.*

The core loop should be:

1. User runs BirdWalk's existing identification workflow.
2. The existing system returns its actual result, including uncertainty when appropriate.
3. User reviews and optionally confirms the suggested species.
4. The observation is saved to a personal bird journal.
5. A species enters the user's unique collection only once.
6. The app awards transparent, server-authoritative points when eligible.
7. The user can view collection progress, achievements, missions, and (when online and signed in) leaderboards.
8. The app encourages the user to put the phone away and observe nature.

**Non-negotiable product principle:** preserve BirdWalk's existing local/offline identification workflow. Gamification, authentication, sync, and leaderboards must be optional additions, not prerequisites for identifying birds locally.

Do not replace the current identification engine, change its confidence policy, or make it return a species when it currently says “Not sure.” Do not upload audio or location automatically.

## 2. Start by inspecting the real repository

Before coding, inspect and report:

- `README`, project docs, license, contribution instructions, and any `AGENTS.md` or equivalent instructions.
- Top-level file tree and package/dependency manifests.
- Frontend framework, routes, state management, styling system, and test setup, if present.
- Backend framework, API routes, data models, and test setup, if present.
- Existing bird-identification flow: how a recording is captured, inference is called, confidence/uncertainty is represented, and a result is displayed.
- Existing local persistence, settings, cache, and offline behavior.
- Current species taxonomy/label files and any existing location/week filtering.
- Existing CI, lint, type-check, build, and test commands.
- Whether any database, auth provider, deployment setup, or cloud integration already exists.
- Current git status and uncommitted user changes. Never overwrite or discard them.

Create a concise **Repository Findings** section in the implementation summary, listing the real files and symbols that the implementation will integrate with. If a feature or infrastructure is absent, say so; do not invent it.

### Repository safety rules

- Do not rewrite the app from scratch.
- Do not perform unrelated refactors or broad dependency upgrades.
- Do not rename or move existing files unless essential and justified.
- Do not delete existing behavior, sample data, model files, user data, or local storage.
- Do not overwrite user changes. Inspect `git status` first and preserve unrelated edits.
- Prefer small, reviewable commits of changes (do not create commits unless requested).
- If the current project is a local Python CLI or desktop workflow rather than a web app, keep it that way and add the optional web/cloud layer only where the repo's architecture supports it.
- If the project does not currently have a React frontend, do not assume one exists or add a new frontend solely to satisfy this document.
- Never expose credentials, tokens, private audio, or precise location in logs, fixtures, screenshots, or documentation.

## 3. Scope and rollout strategy

Deliver a useful first release in these stages. Complete each stage with tests before proceeding.

### Phase 0 — Audit and baseline

1. Map the current application architecture and bird-identification data flow.
2. Run existing tests, lint, type checks, and build using the repo's actual commands.
3. Record pre-existing failures separately from new failures.
4. Identify the smallest integration point where a successful identification can be offered for saving as an observation.
5. Write an implementation plan grounded in actual repository paths.
6. Do not start cloud integration until the baseline and architecture are understood.

**Exit criteria:** repository findings and a baseline test report exist; current identification behavior is unchanged.

### Phase 1 — Personal inventory and observation journal (offline-first)

Add a personal journal and unique-species collection using the repository's current persistence approach. If there is no suitable persistence, select the least invasive local option and document why. Do not introduce a cloud dependency for local use.

Each observation should support fields equivalent to:

- `id`: stable unique identifier generated by the app.
- `speciesId`: canonical identifier from the project's actual taxonomy/label mapping, if available.
- `scientificName`: canonical scientific name when known.
- `commonName`: displayed name from the current result or taxonomy.
- `observedAt`: timestamp in ISO 8601 format.
- `sourceType`: e.g. `birdnet_audio`, `manual_entry`, or the actual source supported by the repo.
- `confidence`: optional numeric value with documented semantics and bounds.
- `identificationStatus`: `ai_suggested`, `user_confirmed`, or `reviewed` only where a real review process exists.
- `notes`: optional user-written field notes.
- `location`: optional coarse location only, and only after explicit user action.
- `recordingReference` / `recordingHash`: optional metadata only if technically available and privacy-safe. Do not store audio by default.

Adapt field names and types to the existing codebase rather than forcing this exact schema if it conflicts with established conventions.

Requirements:

- Users can save, view, and delete their own observations.
- A successful AI prediction is not silently represented as scientifically verified.
- A user can save a “not sure” or unidentified observation without assigning a species.
- The collection's unique-species count is based on distinct canonical species IDs, not common-name strings.
- Repeated sightings remain in the journal but do not create duplicate unique-species entries.
- Collection history survives app restart.
- Handle old, malformed, or missing local data safely; provide a migration/default path without data loss.
- Core identification must still work if the journal feature fails or is disabled.
- If the app is currently command-line based, use a clear command or local journal view consistent with that interface; do not invent a UI framework.

**Exit criteria:** local observations persist; duplicate species are deduplicated in the collection; the original identification path still works offline.

### Phase 2 — Optional accounts and cloud sync

First inspect whether the repo already uses an account system or backend. Reuse existing infrastructure when appropriate. If no cloud infrastructure exists, **Supabase Auth + PostgreSQL** is a reasonable optional default, not a mandatory rewrite. Explain the choice before introducing it.

Requirements:

- Local-only use remains available without signing in.
- Cloud features clearly show when sign-in or internet is required.
- Provide a documented environment-variable template such as `.env.example`; never put real secrets in source control.
- Keep service-role secrets strictly on the server/edge-function side; never bundle them into frontend code.
- Add explicit, user-initiated sync. Do not upload recordings, notes, or location unless the user has knowingly opted in to that specific data.
- Support offline changes with a durable pending-sync queue if the current app architecture can support it.
- Use stable observation IDs and idempotent upserts so retrying sync does not duplicate records.
- Resolve conflicts deterministically and document the rule (e.g. server timestamps plus field-specific policy); do not silently overwrite a newer user edit.
- Include sign-out and account deletion/data-export guidance where supported.
- Provide useful offline, authentication-expired, network-error, and sync-conflict states.
- If no suitable secure backend can be implemented in this task, finish Phase 1 and provide a well-defined cloud integration boundary instead of shipping insecure mock authentication.

**Exit criteria:** anonymous local use works; signed-in users can sync permitted journal data; retrying a sync is safe; secrets are not exposed.

### Phase 3 — Global, country, and weekly leaderboard

Implement leaderboards only after a real identity and server-side scoring mechanism exist. Never claim a mock leaderboard is live.

Leaderboard views:

- **Global:** opted-in users worldwide.
- **Country:** country code supplied by the user, not inferred from exact GPS.
- **Weekly:** points earned during a clearly defined UTC week.
- **All-time:** lifetime eligible points.
- **My rank:** current user's rank even if outside the first page, where feasible.

City/region/friends leaderboards are later enhancements, not a blocker for the MVP. Do not make precise location mandatory.

Rank users primarily by **unique accepted species discoveries** or a clearly documented Explorer XP metric. Show separate, unambiguous metrics where possible:

- Unique species: distinct species in the collection that meet the leaderboard eligibility rules.
- Observations: distinct journal observations, not raw API submissions.
- Explorer XP: points generated by eligible server-side events.
- Verification/review status: only if the product has a real review process.

Do not imply that user confirmation equals scientific verification. Use labels such as “AI suggested,” “user confirmed,” and “community reviewed” precisely.

Leaderboard requirements:

- Pagination and stable ordering.
- Deterministic tie-breaking (e.g. eligible score descending, then stable public user ID or first qualifying timestamp; document the rule).
- Do not expose email, private notes, audio, precise coordinates, or hidden profile fields.
- Opt-in public profile/leaderboard participation, with a clear way to opt out.
- Country can be private/optional.
- Rate-limit or otherwise protect public API endpoints.
- Server calculates all scores; clients cannot submit their own XP or rank.
- Do not rely on a client-side counter as the source of truth.
- Add indexes for actual query patterns and avoid unbounded full-table reads.
- Clearly show empty states and distinguish demo fixtures from production data.
- If the database is not configured, show a setup/configuration state, not fake “global” results.

**Suggested UI filters:** Global, Country, Weekly, All-time. Implement only filters supported by the actual backend.

**Exit criteria:** real, opt-in accounts appear in ranked results using server-calculated metrics; authorization and pagination tests pass.

### Phase 4 — Species collection cards and milestones

Add a collection view that fits the current UI (or CLI) design.

Each card may display:

- Common and scientific names.
- First discovery date.
- Number of distinct observations.
- User notes, only to the owner.
- A photo only when a legitimate local asset or properly licensed source is available.
- Identification status and confidence where useful.
- Optional broad location only when the user opted to save it.

Milestone examples:

- First Feather — first accepted species.
- Backyard Explorer — 5 unique species.
- Bird Collector — 25 unique species.
- Nature Enthusiast — 50 unique species.
- BirdWalk Veteran — a sustained collection milestone, not merely repeated app opens.

Milestones must be computed from authoritative collection state and be idempotent. Avoid promising image assets, rarity values, or taxonomy data that the project does not have.

**Rarity safety:** do not incentivize users to find, approach, disturb, or disclose locations of endangered, nesting, or sensitive species. Do not label a species “rare” without a reliable, region- and season-appropriate source. If the app lacks such data, omit rarity or label it unknown. Never make rarity affect rewards in a way that encourages unsafe wildlife interaction.

**Exit criteria:** cards and milestone counts match journal data and do not duplicate after reload or sync retry.

### Phase 5 — XP and outdoor missions

Add a transparent and configurable scoring rules module. Store scoring rules in one place and test them.

Suggested starting values for playtesting (not scientifically meaningful, and subject to adjustment):

| Eligible action | Initial XP |
| --- | ---: |
| First eligible discovery of a unique species | +100 |
| Distinct repeat observation | +10 |
| Daily outdoor mission completed | +30 |
| Weekly challenge completed | +150 |
| Learning quiz completed | +20 |
| Collection milestone | +100 |

Do not award points for repeated submissions of the same event. If these values are changed, update tests and documentation together.

Use an append-only `xp_events`/ledger pattern if supported by the backend:

- Every event has a stable ID and unique idempotency key.
- Event type, subject, points, creation timestamp, and relevant observation/milestone reference are stored.
- Client requests an eligible action; server validates and records it.
- Duplicate event delivery cannot grant duplicate XP.
- Scores can be audited/recomputed from the ledger.
- Never accept arbitrary client-supplied point totals.

Initial mission ideas:

- **Backyard Explorer:** observe birds in a garden, balcony, or nearby green space.
- **Sound Detective:** learn to distinguish calls; never claim a correct ID when evidence is insufficient.
- **Diversity Challenge:** observe three different species during a walk.
- **Quiet Observer:** spend 10 minutes observing nature with minimal phone use.
- **Phone-Away Challenge:** after an identification, invite the user to put the phone away and observe for two minutes.

Mission completion that cannot be independently verified must be labelled **self-reported**. Do not claim the app knows whether the phone was put away or that a user was outdoors unless the system actually verifies it with consent. Do not require daily app opens, notifications, GPS, or continuous microphone use for streaks.

**Exit criteria:** XP rules are testable, server-authoritative for online accounts, duplicate-safe, and transparent.

### Phase 6 — Privacy, safety, and responsible competition

Privacy defaults:

- No audio upload by default.
- No precise location publication.
- No location permission required to identify birds or maintain a collection.
- Public leaderboard participation is opt-in.
- Country and display name are user-controlled where possible.
- Users can delete observations and understand what deletion means for leaderboard aggregates.
- Avoid collecting date of birth or other unnecessary personal data.
- Use coarse location for public display only when explicitly enabled.
- Do not reveal exact nesting locations or sensitive-species coordinates.
- Document data retention and deletion behavior.

Anti-abuse measures:

- Enforce authorization and ownership on the server/database.
- Use unique constraints for `(user_id, species_id)` and idempotency keys for events.
- Reject malformed confidence values and invalid species IDs.
- Apply sensible request limits to observation and XP endpoints.
- Detect repeated identical payloads/audio hashes where available, but treat flags as review signals, not proof of cheating.
- Do not award confirmed-species leaderboard credit from AI predictions alone if the user has not accepted them.
- Keep automated “suspicious activity” decisions explainable and provide a way to correct obvious false positives.
- Do not treat GPS as proof of a sighting.
- Do not make location sharing a condition for leaderboard participation.

Security implementation must follow the existing stack. If using Supabase, enable Row Level Security for user-owned tables, write explicit policies, and test both authorized and unauthorized access. Public leaderboard data should come from a constrained view or server endpoint that exposes only intended public fields.

### Phase 7 — Learning mode (optional after MVP)

Add concise learning content only if a reliable source is available in the repo or a documented licensed dataset is chosen:

- How to recognize a species.
- Habitat and seasonal context.
- Audio examples when licensing permits.
- Similar-species comparison.
- Common identification confusions.

Do not hallucinate bird facts from an LLM. Prefer sourced taxonomy/field-guide data and display provenance where appropriate. If content is unavailable, leave the section out rather than inventing facts.

### Phase 8 — Friends, teams, maps, and community goals (later)

Do not block the first release on these features.

Potential follow-ups:

- Friends-only leaderboard and opt-in reactions.
- Team challenges for clubs/schools.
- Personal map of coarse, user-approved discovery regions.
- Community species-count goals.
- Event-based biodiversity challenges.

Before maps or community features are implemented, define moderation, abuse reporting, privacy controls, and sensitive-species location suppression. No public map should expose precise locations by default.

---

## 4. Data model and invariants

Adapt the schema to the current database and coding conventions. If PostgreSQL/Supabase is used, a starting logical model is:

### `profiles`

- `id` — references the auth identity.
- `display_name` — validated public display name.
- `country_code` — optional ISO country code.
- `leaderboard_opt_in` — false by default unless the user explicitly opts in.
- `created_at`, `updated_at`.

### `species`

- `id` — stable canonical ID from the existing taxonomy where possible.
- `scientific_name`.
- `common_name` or localized names where supported.
- `source` / taxonomy version if available.

Avoid copying an incomplete or incompatible taxonomy into a second competing source of truth.

### `observations`

- `id` — client-generated UUID or stable ID.
- `user_id` — nullable only for a genuinely local anonymous record; cloud rows must be securely owned.
- `species_id` — nullable for “not sure” or unidentified observations.
- `observed_at`.
- `source_type`.
- `confidence` — nullable; validated numeric range and documented meaning.
- `identification_status`.
- `notes` — private by default.
- `coarse_region` — optional, consent-based.
- `created_at`, `updated_at`, `deleted_at` or a defined deletion strategy.
- `sync_version` or equivalent only if needed for conflict handling.

### `user_species`

- `user_id`.
- `species_id`.
- `first_observation_id`.
- `first_discovered_at`.
- Unique constraint on `(user_id, species_id)`.

This table can be derived from eligible observations, but if it is materialized for performance, keep it transactionally consistent and provide a reconciliation strategy.

### `xp_events` (online leaderboard)

- `id`.
- `user_id`.
- `event_type`.
- `points`.
- `idempotency_key` (unique in the appropriate scope).
- Optional `observation_id` / `milestone_id`.
- `created_at`.
- Any validation/review status required by the real scoring rules.

### Invariants that tests must enforce

1. One user can have at most one unique collection entry per canonical species.
2. One observation ID cannot create duplicate observations on retry.
3. One scoring event/idempotency key cannot award points twice.
4. AI suggestion, user confirmation, and genuine external review are distinct states.
5. Local identification never requires cloud availability.
6. An anonymous local journal is not automatically uploaded.
7. No precise location or recording is public by default.
8. Leaderboard values are calculated from trusted server/database state.
9. Deleting an observation follows a documented, consistent rule for collection and XP. Never silently retain a deleted sighting as if it still exists.
10. Species identity is based on canonical IDs, not case-sensitive common-name text.

---

## 5. API boundaries (only if this repo has or needs a server API)

Use the existing API conventions. Do not add these routes literally if the project uses a different interface.

Potential operations:

- `GET /me/collection`
- `GET /me/observations`
- `POST /me/observations`
- `PATCH /me/observations/:id`
- `DELETE /me/observations/:id`
- `POST /me/sync` (or equivalent batch sync endpoint)
- `GET /leaderboard?scope=global&period=weekly&cursor=...`
- `GET /me/achievements`
- `POST /me/missions/:missionId/complete`

For every operation, define:

- Authentication requirement.
- Input validation.
- Ownership/authorization rules.
- Response shape and errors.
- Pagination and rate limits for list endpoints.
- Idempotency semantics for write endpoints.
- Whether the operation is available offline.

Never trust `user_id`, `points`, `rank`, or `is_verified` sent by the client. Derive the user identity from the authenticated session, compute points server-side, and allow only legitimate status transitions.

---

## 6. UI/UX requirements

Match the project's existing design language. Do not redesign unrelated screens.

Add the smallest set of screens/views necessary for the current architecture:

1. **Collection:** unique species count, recent observations, search/filter, empty state.
2. **Observation details:** names, date, status, notes, optional coarse location, delete action.
3. **Explorer League:** global/country/weekly/all-time filters that the backend truly supports.
4. **Profile/settings:** display name, opt-in leaderboard toggle, country setting, privacy controls, sync status.
5. **Missions/achievements:** only when Phases 4–5 are implemented.

UX principles:

- Keep the identification action primary and quick.
- Offer “Save observation” without forcing an account.
- Make AI uncertainty obvious.
- Avoid full-screen celebrations that interrupt outdoor use; prefer brief, dismissible feedback.
- Do not use manipulative notifications or require streak maintenance.
- Respect keyboard navigation and accessible contrast in web UIs.
- Provide loading, error, empty, offline, and signed-out states.
- Do not ship placeholder leaderboards as though they contain real community data.

---

## 7. Testing strategy and acceptance criteria

Use the repo's existing test framework. Add new dependencies only when needed and justified.

### Unit tests

- Canonical species ID normalization/mapping.
- Unique-species count.
- Observation status transitions.
- XP calculation for each event.
- Duplicate idempotency key handling.
- Weekly period boundaries and timezone behavior.
- Achievement thresholds.
- Input validation and invalid confidence values.
- Local storage migration and malformed-data recovery.

### Integration tests

- Save, reload, edit, and delete a local observation.
- Duplicate species appear once in collection but all valid sightings remain in the journal.
- Original identification works with networking disabled.
- Anonymous user cannot access another user's cloud data.
- User cannot change another user's observations.
- Client cannot submit arbitrary XP or verification status.
- Repeated API retries do not duplicate observations or points.
- Opted-out users do not appear in public leaderboards.
- Public leaderboard response contains no private fields.
- Sync failure preserves local records and retries safely.
- Database RLS policies are tested if Supabase is used.

### Regression tests

- Existing bird-identification tests continue to pass.
- Existing confidence/“Not sure” behavior remains unchanged.
- Existing location/week filtering and taxonomy handling are not broken.
- No existing command, endpoint, or workflow is removed without explicit approval.

### Required final verification

Run the actual available commands for:

- Tests.
- Lint.
- Type checking.
- Build/package validation.

If a command cannot run due to missing credentials, model assets, services, or network, state that explicitly and provide the exact reason. Do not claim tests passed if they were not run.

### Definition of done

The work is done only when:

- The existing local bird-identification workflow remains functional and offline-capable.
- A user can maintain a persistent personal journal and unique species collection.
- Duplicate observations do not inflate unique-species counts.
- Cloud functionality is optional and clearly configured.
- If a real backend is implemented, leaderboard ranking and XP are server-authoritative.
- Privacy and authorization tests exist.
- Documentation explains setup, migrations, environment variables, privacy, and known limitations.
- Tests/lint/typecheck/build have been run and results reported accurately.
- No secrets or real user data are committed.

---

## 8. Configuration, migrations, and documentation

If cloud support is added:

- Add an `.env.example` containing placeholder names only.
- Document local-only setup separately from cloud-enabled setup.
- Add versioned, reversible or carefully documented database migrations.
- Never run destructive migrations automatically against production.
- Document required Auth redirect URLs and deployment configuration if applicable.
- Include a clear first-run state when credentials are missing.
- Keep local inference independent of cloud environment variables.

Update the project's existing README/docs rather than duplicating or replacing them unnecessarily. Explain:

- How to use the personal journal.
- What counts as a unique species.
- The difference between AI suggestion, user confirmation, and review.
- How to opt in/out of leaderboards.
- What data syncs and what stays local.
- How to export/delete user data, where supported.
- Known limitations of anti-cheat and self-reported missions.

---

## 9. Suggested implementation order

Do not attempt to land every feature in one giant patch. Work in small checkpoints:

1. Audit repository and baseline.
2. Add local observation model and storage.
3. Integrate a safe “save observation” action after the existing result.
4. Add collection summary and unique-species tests.
5. Add optional cloud schema/auth/sync only if architecture and configuration support it.
6. Add secure server-side score events.
7. Add leaderboard endpoints/views and pagination.
8. Add collection cards and achievements.
9. Add missions and self-reported completion.
10. Harden privacy, RLS/authorization, and abuse controls.
11. Run regression suite and document results.

At each checkpoint:

- Summarize changed files and why.
- Run targeted tests.
- Inspect the diff for unrelated changes and secrets.
- Preserve backward compatibility.
- Stop and report blockers instead of fabricating external service configuration.

---

## 10. Coding-agent execution prompt

Copy the prompt below into the coding agent that has access to the cloned repository.

> You are a senior engineer modifying the existing BirdWalk repository at `https://github.com/sawanmani/BirdWalk.git`.
>
> Implement the requirements in `BIRDWALK_EXPLORER_LEAGUE_IMPLEMENTATION.md` (or the path where this document is saved). Your first task is to inspect the repository—not to start coding immediately.
>
> **Mandatory workflow**
>
> 1. Read project instructions, README/docs, manifests, tests, and current git status. Preserve uncommitted work.
> 2. Map the actual identification workflow, local/offline guarantees, persistence, UI/API, taxonomy, and tests. Cite exact file paths and symbols in your plan.
> 3. Run baseline checks that the repo supports. Record pre-existing failures.
> 4. Propose a phased plan adapted to the real codebase. Do not assume React, FastAPI, Supabase, or any route exists unless the repository confirms it.
> 5. Implement Phase 1 first: offline-friendly observation journal, canonical unique-species collection, safe save/confirm UX, persistence, migration handling, and tests. Keep the current identification model and “Not sure” behavior unchanged.
> 6. Only then implement optional cloud auth/sync and the global leaderboard if the repo's architecture and available configuration support them. Reuse an existing backend where possible. If none exists, propose Supabase as an optional path, but never fake authentication or live leaderboard data.
> 7. Add server-authoritative, idempotent XP/leaderboard logic; protect data with explicit authorization and database policies if applicable.
> 8. Implement species collection cards, achievements, and low-pressure outdoor missions after the core journal and ranking are correct.
> 9. Add tests for duplicates, retries, privacy, ownership, offline behavior, uncertainty handling, and score integrity.
> 10. Run tests/lint/typecheck/build, inspect the final diff, and update docs.
>
> **Hard constraints**
>
> - No rewrite from scratch, no unrelated refactor, no destructive data migration.
> - Do not break or cloud-gate existing local bird identification.
> - Never upload audio/location by default.
> - Do not equate AI prediction or user confirmation with scientific verification.
> - Do not expose precise location, private notes, recordings, email, tokens, or service secrets.
> - Do not accept client-supplied XP, rank, user identity, or verification state as authoritative.
> - Make writes idempotent; retries must not duplicate observations, unique species, achievements, or XP.
> - Do not introduce mock data as a real global leaderboard.
> - Do not claim a test passed unless it actually ran and passed.
> - Keep changes incremental and explain any deviation from the brief.
>
> **Final response format**
>
> - Repository findings (actual stack and relevant paths).
> - Features implemented and intentionally deferred.
> - Changed/added files.
> - Data migration and environment setup steps.
> - Privacy/security decisions.
> - Commands run and their actual results.
> - Known limitations and next steps.
>
> Start with the repository audit. If repository access is unavailable, say so and request the local checkout or repository access; do not invent repository structure.

---

## 11. Practical note

This document is intentionally repository-aware rather than tied to guessed filenames. Save it in the repo, then ask your coding agent to follow the **Execution Prompt**. The agent should inspect the current checkout and implement only what fits the real architecture while preserving the working offline bird-identification experience.
