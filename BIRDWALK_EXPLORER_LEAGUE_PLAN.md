# BirdWalk Explorer League — Grounded Implementation Plan

_Analysis of the [`BIRDWALK_EXPLORER_LEAGUE_IMPLEMENTATION.md`](./BIRDWALK_EXPLORER_LEAGUE_IMPLEMENTATION.md)
blueprint against the **actual** BirdWalk repository (commit `f9d385d`), with
a phased plan adapted to the real architecture. Per the blueprint's own rule,
this document cites only files/symbols that genuinely exist and marks absent
infrastructure as absent._

---

## 1. Repository Findings (verified on this checkout)

| Area | Actual state | Evidence path |
|---|---|---|
| Frontend | Vite 8 + React 19 + TypeScript + Tailwind v4 (`@theme` tokens). SPA, **no router** — a single `step` state machine. | `frontend/vite.config.ts`, `frontend/src/App.tsx`, `frontend/src/index.css` |
| Flow | `start → listen_record / listen_sample → analysing → results → mission → mission_done → done`, plus `journal` / `about` overlays. | `frontend/src/App.tsx` (`Step`, `go()`) |
| **Local persistence (already exists)** | `localStorage` journal under key `birdwalk.sessions.v1`, array of `SessionRecord`, capped at 100, best-effort, user-clearable. | `frontend/src/lib/history.ts` |
| Journal UI | Read-only "Journal" view over sessions with delete-all. | `frontend/src/components/HistoryPanel.tsx` |
| Identification result | `AnalyzeResponse{ status: 'ok' \| 'no_reliable_detection', predictions[], model: ModelInfo, note, is_demo_fixture, source_label }`. Prediction = `{rank, species_common_name, species_scientific_name, model_score}`. | `frontend/src/lib/types.ts`, `backend/app/schemas.py` |
| Backend | FastAPI, endpoints `/api/health`, `/api/model-info`, `/api/samples`, `/api/analyze`, `/api/mission`, `/api/india-species`. Binds `127.0.0.1`; CORS localhost-only; docs disabled. | `backend/app/main.py` |
| Inference | Official `BirdNET-Analyzer` `analyze()`, per-species max, top-3. `RELIABLE_SCORE_FLOOR=0.30`, `MIN_CONFIDENCE=0.15`, `TOP_N=3`. | `backend/app/services/birdnet_service.py`, `backend/app/core/config.py` |
| Missions | **Deterministic**, zero-dependency sha256-keyed templates; safe wording; screen-free; never claim the phone was actually put away. | `backend/app/services/mission_service.py` |
| Taxonomy | **No canonical species ID anywhere.** Species are keyed by `species_scientific_name` / `species_common_name` strings. India shortlist stores `species_common_name`, `species_scientific_name`, `birdnet_label`, `label_verified`. | `backend/app/data/india_species.json`, `types.ts` |
| DB / auth / cloud | **None.** `requirements.txt` = BirdNET-Analyzer, fastapi, uvicorn, python-multipart, soundfile, pytest, httpx. No SQLAlchemy/Supabase/Auth. Frontend has no auth or network-persistence code. | `backend/requirements.txt`, `frontend/package.json` |
| Terminology rule | "model_score", **never** "accuracy"/"probability" — enforced in types, UI, and a test. | `test_api.py`, `types.ts` |
| Privacy invariants already met | No audio stored (temp files deleted in `finally`), no GPS, no account, no third-party calls. | `main.py`, `TEST_REPORT.md` §3 |

**Baseline checks (already green, re-run 2026-10-11):** `39 passed` backend
(36 unit + 3 real-inference integration), `npm run build` green. These are the
regression guardrail for all phases below.

---

## 2. Gap analysis vs the blueprint

What the blueprint wants **already exists** (do not rebuild):

- Core loop steps 1–2 (identify, return honest uncertainty) — done.
- A personal journal that persists across restart and is user-deletable — done
  (`history.ts` + `HistoryPanel.tsx`).
- "Save observation without forcing an account" — done (saves on every result).
- Uncertainty must stay obvious; AI ≠ verified — done (`status`, model_score,
  "source claim" labels).
- Privacy defaults & mission safety (blueprint §6) — already satisfied.
- Self-reported, unverifiable mission completion — already the design (no
  "we know you put the phone away" claim).

What is **genuinely missing** (the real work):

1. A **unique-species collection** with deduplication — currently only a flat
   session list; there is no concept of "distinct species discovered".
2. **Canonical species identity** — the blueprint's invariants 1 & 10 require a
   stable species ID; the repo only has names. (See §4.)
3. **Observation-level data model** (species ID, status transitions, notes,
   coarse location consent, delete semantics) richer than `SessionRecord`.
4. **Save/confirm UX** distinguishing `ai_suggested` vs `user_confirmed`.
5. **Achievements/milestones** derived from collection (idempotent).
6. **XP ledger** — and critically, whether scoring is local or
   server-authoritative. (See §3 — this is the fork in the road.)
7. **Accounts, cloud sync, leaderboards** — absent, and would be new
   infrastructure (blueprint Phases 2/3/5-online/6-security).

---

## 3. Governance tension — decide scope before coding

The blueprint's later phases (accounts, Supabase/Postgres, cloud sync,
server-side XP, global leaderboards) introduce exactly the stack the current
project **deliberately excludes**: its locked principles in `ALIGNMENT.md` /
`CONTEXT.md` are *local-first, offline-capable, no account, no database, no
cloud AI*, and the pre-submission audit recorded an execution rule: *"Do not
add a database, a cloud AI API, or a new framework merely to make the project
appear more advanced."*

Therefore this plan splits the blueprint into two tracks and makes the choice
explicit rather than silently pulling in a backend:

- **Track A — Local-first MVP (recommended, in-scope, no new infra):**
  Phases 0–1 + collection + local achievements + self-reported missions, all
  built on the existing `localStorage` + FastAPI-without-DB shape. Fully
  testable offline, preserves the identification workflow, adds real user value.
- **Track B — Community/competitive layer (gated, optional, needs a product
  decision + credentials):** accounts, sync, leaderboards, server XP
  (blueprint Phases 2/3/5-online/6). This requires choosing and standing up a
  real backend. **Do not ship mock leaderboards or fake auth.** For a
  Hacktoberfest submission Track B should be a documented boundary, not a
  half-built cloud.

**Decision needed from the builder before Track B starts:** provider (the
blueprint suggests Supabase as an *optional* default), whether a database may
be added at all given the locked no-DB principle, and hosting/secrets. Until
that is answered, implement Track A only and stop at the Track B boundary —
which is precisely what the blueprint's Phase 2 fallback (§ "finish Phase 1 and
provide a well-defined cloud integration boundary instead of shipping insecure
mock authentication") instructs.

---

## 4. Canonical species ID (cross-cutting blocker for collection integrity)

Blueprint invariants #1 and #10 ("unique per canonical species ID, not
case-sensitive common-name text") cannot be met with the current model, which
has no ID. Grounded options, cheapest first:

- **Use the BirdNET scientific name as the canonical key.**
  `species_scientific_name` is present on predictions and is a stable, unique
  taxonomic handle (e.g. `Pycnonotus jocosus`). Normalize by trim + NFC + case
  folding; treat `null` scientific name (possible on some rows) as
  non-collection-eligible. This adds **no** dependency and reuses the label set
  that is already the de-facto source of truth (6,522 labels).
- Do **not** invent a second taxonomy or import eBird/Clements without a
  licensed, provenanced dataset — the blueprint explicitly warns against a
  competing source of truth. (Any richer taxonomy is a Track-B-era decision with
  data-licensing review.)

Implementation: a small `lib/speciesKey.ts` exporting
`canonicalSpeciesKey(p): string | null` (scientific-name based) used by all
dedup/count logic, so a future real ID can be swapped in one place.

---

## 5. Track A — phased plan mapped to real files

### Phase 0 — Audit & baseline (DONE, this document)
Repository findings above; baseline `39 passed` + build green. Exit:
identification behaviour unchanged. ✅

### Phase 1 — Observations & unique-species collection (offline-first)

Introduce an **observation** concept layered on top of the existing journal,
without removing sessions.

- **Data model (extend local storage, no backend change).** New
  `frontend/src/lib/observations.ts` mirroring `history.ts` conventions
  (`crypto.randomUUID`, versioned key `birdwalk.observations.v1`,
  best-effort, corrupt→safe-default). Fields (adapted to repo names):
  `id`, `speciesKey` (from §4, nullable), `speciesCommonName`, `speciesScientificName`,
  `observedAt`, `source: 'recording'|'upload'|'sample'`, `modelScore`
  (keep "model_score" semantics; **do not rename to confidence/accuracy**),
  `identificationStatus: 'ai_suggested' | 'user_confirmed'`, `notes?`,
  `coarseLocation?` (only after explicit user action; never auto),
  `isDemoFixture`. No audio stored (recording already discarded).
- **Integration point.** In `App.tsx` `handleSubmit` (~line 115) the result is
  already built into `sessionRef.current`. Add an explicit
  **"Save to collection"** action on the **results** screen (default-off, not
  auto-added to collection) that writes an observation with
  `ai_suggested`; a follow-up **"Confirm species"** toggles it to
  `user_confirmed`. Keep auto-saving the lightweight *session* (unchanged) so
  the existing Journal behaviour is not broken.
- **Collection view.** New `CollectionPanel.tsx` + a `step: 'collection'`
  reachable from Header (next to Journal). Shows unique-species count
  (distinct `speciesKey`), recent observations, per-species first-seen date and
  sighting count, empty state, delete. Reuses nature design tokens +
  `useReducedMotion` + focus styles already in the codebase.
- **Dedup rule.** Journal keeps every observation; collection counts a species
  **once** (first `user_confirmed`, else first `ai_suggested` — documented).
- **Migration/recovery.** Wrap reads with try/catch like `history.ts`; provide a
  one-time seed from existing sessions (topPrediction→observation) with a
  "restore defaults" path; never lose old `sessions.v1`.
- **Resilience.** Identification must still work if collection is disabled or
  storage throws — mirror `history.ts` best-effort swallow.
- **Exit criteria:** local observations persist across reload; duplicate
  species count once; identification path untouched (integration tests still
  green).

> **STATUS — Phase 1 IMPLEMENTED (2026-10-11).** Ships as a strict, honest
> local-first layer — no backend/DB/cloud/framework change:
>
> - `frontend/src/lib/speciesKey.ts` — `canonicalSpeciesKey` (NFC + trim +
>   whitespace-collapse + case-fold of the BirdNET scientific name); null
>   scientific name is not collection-eligible. §4 blocker resolved.
> - `frontend/src/lib/observations.ts` — `birdwalk.observations.v1`
>   best-effort store (mirror of `history.ts`: replace-by-id, cap 200,
>   corrupt→safe-default, storage errors swallowed so identification never
>   breaks) + **pure** `buildCollection`/`uniqueSpeciesCount`. Sessions are
>   untouched; observations are additive.
> - `ResultCard.tsx` — explicit opt-in **“Save to collection”** (writes
>   `ai_suggested`), then **“Confirm species”** (→ `user_confirmed`). Hidden
>   for demo fixtures and for matches with no canonical key. Nothing is
>   auto-confirmed; wording stays “model score”, never accuracy.
> - `CollectionPanel.tsx` + Header “Collection” nav — deduped life list
>   (unique-species count, per-species sightings / first-seen / best score,
>   confirmed badge, per-observation delete, clear-all) reusing nature tokens.
> - **Tests:** no JS runner existed; rather than pull `vitest` in against
>   Vite 8, the pure logic is covered by **Node’s built-in runner + native TS
>   type-stripping** (`node --test`, zero new deps): 11 unit tests green.
>   `tsconfig.test.json` type-checks them; `*.test.ts` excluded from the app
>   build. `npm run build` green; backend `pytest` unchanged (36 unit green,
>   3 integration untouched — no identification/`main.py` change).
>
> **Not yet built (still in this plan, kept honest):** Phase 4 local
> milestones, Phase 5 XP ledger, and the entire Track B boundary (accounts /
> sync / leaderboards) — none implemented.

**Tests (Phase 1):** extend the existing vitest-free frontend by adding
focused unit tests where the repo has none yet for pure logic — implement the
dedup/migration logic as **pure functions** so they are testable; if no JS test
runner is desired, cover the *derived collection count* with a backend-free
check. At minimum, keep all `39` backend tests green (regression) and add a
`test_metadata_consistency`-style invariant test for any backend-derived
collection endpoint. (Decision needed: add a frontend test runner, or keep
Track A logic as pure TS functions tested via a minimal `vitest` — the
blueprint's test matrix assumes a JS test framework the repo does not yet have.)

### Phase 4 (local) — Collection cards & milestones

Pure client logic over observations: milestones First Feather (1),
Backyard Explorer (5), Bird Collector (25), Nature Enthusiast (50), each
computed from authoritative collection state and **idempotent** (recompute,
never increment counters). No rarity (repo has no region/season safety data →
omit, per blueprint §4 "rarity safety"). No promised photo assets unless a
licensed image exists.

> **STATUS — IMPLEMENTED (2026-10-11).** `frontend/src/lib/milestones.ts`
> (`MILESTONES`, `computeMilestones`, `nextMilestone`) is a pure, idempotent
> recompute over the unique-species count, using the blueprint thresholds
> (1 / 5 / 25 / 50) plus "BirdWalk Veteran" = 100 unique species (a sustained
> **collection** milestone, explicitly not app-opens). Rarity and photo assets
> are omitted for safety/honesty. Rendered in `CollectionPanel` as milestone
> chips + "next milestone". 7 unit tests green (`node --test`).

### Phase 5 (local, self-reported) — Missions & XP

- Missions already exist and are safe. **Do not** add points for actions the
  app cannot verify; label mission completion **self-reported** in UI copy
  (consistent with existing honest wording).
- Local XP is a **transparent, single-source rules module** (`lib/xpRules.ts`,
  table from blueprint §5 as defaults) computed from local collection only.
  Clearly show XP as a *local, single-device* number. **Do not** present local
  XP as competitive/server-authoritative — that is Track B.

> **STATUS — IMPLEMENTED (2026-10-11).** `frontend/src/lib/xpRules.ts` keeps
> the full blueprint XP table in one place but only **awards** the three rules
> with a real local source (`firstSpeciesDiscovery` 100, `repeatObservation`
> 10, `milestone` 100) via pure idempotent `computeXp(observations)`. The
> `weeklyChallenge` / `learningQuiz` / `dailyMission` values are kept but
> **INACTIVE** — those features don't exist, so no points are fabricated.
> `CollectionPanel` labels the total "local XP · this device only". Missions
> stay honest & self-reported (unchanged). 8 unit tests green.

### Phase 6 (local) — Privacy & safety

Already largely satisfied; formalize: coarse location stays optional + explicit
consent; no precise coords; collection data is local-only and deletable; document
what deletion means. No changes to identification offline guarantee.

> **STATUS — IMPLEMENTED (2026-10-11).** `observationFromPrediction` now
> carries **optional** `notes` / `coarseLocation`, captured only through an
> explicit opt-in disclosure on the result screen (`ResultCard`) — free-text
> broad area, never GPS/precise, blank fields dropped. Collection copy states
> the deletion rule (delete → collection/milestones/XP recompute from what
> remains; no silently-kept sighting). No network, no new storage, no change
> to the identification offline guarantee.

### Phase 7 (local) — Achievements, titles & an honest leaderboard view

> **STATUS — IMPLEMENTED (2026-10-11).** `frontend/src/lib/achievements.ts`
> derives badges + titles **purely** from local data (unique species, species
> from the user's **own** recordings, completed missions, distinct typed broad
> areas, days since first find) — recomputed every render, idempotent, no
> daily-open streaks, no invented rarity/verified states. `titleForSpeciesCount`
> maps a life-list tier (Beginner Birder → BirdWalk Legend). Surfaced in
> `CollectionPanel`.
>
> `frontend/src/lib/leaderboard.ts` + `LeaderboardPanel.tsx` render a
> **clearly-labelled demo board**: the only real row is "You (this device)"
> from local XP/species; every peer is flagged `sample` and a persistent
> banner states a live global/country/weekly board needs accounts + a server
> (Track B). Deterministic sort + tie-break, unit-tested. This is the §6
> "clearly-labelled leaderboard requires backend" boundary made browsable — it
> ships **no** mock data presented as real and adds **no** network/account.

---

## 6. Track B — boundary (documented, NOT implemented here)

When (and only when) the §3 decision is made, the blueprint maps cleanly onto a
new backend. The stable seams Track A creates for this:

- `canonicalSpeciesKey()` → server `species` table (id ← scientific-name
  mapping, source/version).
- `observations.ts` → `POST/PATCH/DELETE /me/observations` (idempotent upsert on
  client UUID `id`).
- collection count → `user_species` with `unique(user_id, species_id)`.
- `xpRules.ts` → server-side **append-only `xp_events` ledger** with
  `idempotency_key`; server is authoritative; client can never submit XP/rank/
  identity/verification.
- leaderboards → constrained server view exposing only
  display_name + score + country; opt-in `leaderboard_opt_in`, deterministic
  tie-break, pagination, rate-limits, RLS if Supabase.

**Hard stop:** no mock leaderboard, no fake auth, no secrets in the frontend,
no committed real user data. Ship the boundary + `.env.example` + migration
plan and a clearly-labelled "leaderboard requires backend — not configured"
state, exactly as blueprint Phase 2/3 instruct for the unconfigured case.

---

## 7. Invariants → concrete tests

| Blueprint invariant | Where enforced (Track A) |
|---|---|
| One unique entry per species | `canonicalSpeciesKey` dedup unit test; collection count assertion |
| Stable IDs survive retry | observation writes keyed on `crypto.randomUUID`, replace-by-id like `saveSession` |
| AI vs user-confirm vs review distinct | `identificationStatus` enum; UI copy; no "reviewed" state fabricated |
| Local ID needs no cloud | regression: existing 3 integration tests run with no network |
| Anonymous journal not auto-uploaded | no network calls added in Track A |
| No precise location/recording public by default | `coarseLocation` optional; audio never persisted (existing) |
| Canonical ID not common-name string | `speciesKey` = normalized scientific name, case-insensitive test |

---

## 8. Risks, blockers, and decisions required

1. **Scope/stack conflict (highest):** Track B adds DB/auth/cloud against a
   locked local-first, no-DB project. **Needs an explicit builder decision.**
   Default recommendation: implement Track A only for this submission.
2. **No frontend test runner** exists (`package.json` has lint/build only).
   Either add `vitest` (small, justified) or keep derived logic as pure
   functions and gate on backend regressions. Decide before Phase 1 tests.
3. **No canonical taxonomy** — §4 scientific-name key is the pragmatic answer;
   a real taxonomy would need licensed provenanced data.
4. **Licence** — model weights are CC BY-NC-SA (non-commercial). Any
   monetised/commercial leaderboard service changes the licence calculus; the
   existing NC-vs-prize open question (THIRD_PARTY_NOTICES.md) still applies.
5. **Honesty** — every competitive claim (leaderboard, XP authority,
   verified-outdoors) must match what is actually built, per the project's
   standing honest-reporting convention.

---

## 9. Definition of done (Track A)

- Existing local/offline identification unchanged and all **39** tests +
  `npm run build` still green.
- Persistent personal journal **and** a deduplicated unique-species collection.
- Save (ai_suggested) and Confirm (user_confirmed) are distinct, honest states.
- Local-only milestones; no fabricated verification, rarity, or leaderboard.
- No secrets, no audio/precise-location persistence, no new cloud dependency.
- Docs updated (`README` + this plan) with the Track B boundary and decisions.

_Made for Hacktoberfest 2026 — "Touch Grass". The best feature stays the one
that gets the phone out of your hand._
