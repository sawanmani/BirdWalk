// Explorer League Track A — Phase 5: local XP, transparent single-source rules.
//
// This is a LOCAL, single-device score recomputed from authoritative
// collection state on every render — never an incrementing counter, never
// client-submitted and never presented as competitive/server-authoritative.
// Server-authoritative XP + idempotent `xp_events` is Track B (see plan §6)
// and needs a real backend; there is none here, so this is honest local play.
//
// Values are the blueprint §Phase 5 "suggested starting values" table, kept in
// ONE place so they can be tuned in a single commit alongside their tests.
// Rules with no event source in the current app are marked INACTIVE and are
// deliberately NEVER awarded — we do not invent points for features that do
// not exist (weekly challenges, learning quizzes), per the project's honesty
// rule.

import { computeMilestones } from './milestones.ts'
import { uniqueSpeciesCount, type Observation } from './observations.ts'

export const XP_RULES = {
  /** First time a unique species enters the collection. */
  firstSpeciesDiscovery: 100,
  /** Each additional distinct observation of an already-collected species. */
  repeatObservation: 10,
  /** A collection milestone newly reached. */
  milestone: 100,
  /** Self-reported daily outdoor mission — INACTIVE in Track A local XP. */
  dailyMission: 30,
  /** INACTIVE — no weekly-challenge feature exists yet. */
  weeklyChallenge: 150,
  /** INACTIVE — no learning-quiz feature exists yet. */
  learningQuiz: 20,
} as const

/** Rules the current local app can actually and honestly award. */
export const ACTIVE_XP_RULES = [
  'firstSpeciesDiscovery',
  'repeatObservation',
  'milestone',
] as const

export interface XpBreakdown {
  uniqueSpecies: { count: number; points: number }
  repeatObservations: { count: number; points: number }
  milestonesReached: { count: number; points: number }
  total: number
}

/**
 * Pure: derive local XP from the raw observation list.
 * - unique species = distinct canonical keys (first-discovery XP each)
 * - repeat observations = collection-eligible observations beyond the first
 *   per species
 * - milestones = count of achieved milestones (recomputed, idempotent)
 * Non-eligible observations (null species key) contribute nothing.
 */
export function computeXp(observations: Observation[]): XpBreakdown {
  const unique = uniqueSpeciesCount(observations)
  const eligible = observations.filter((o) => o.speciesKey).length
  const repeats = Math.max(0, eligible - unique)

  // Milestones are based on the unique-species count (plan §Phase 4/5).
  const milestonesReached = computeMilestones(unique).filter((m) => m.achieved).length

  const uniquePoints = unique * XP_RULES.firstSpeciesDiscovery
  const repeatPoints = repeats * XP_RULES.repeatObservation
  const milestonePoints = milestonesReached * XP_RULES.milestone

  // Confirmation is a user statement, not extra points: awarding more for
  // "confirmed" would imply a verification the app does not perform.
  return {
    uniqueSpecies: { count: unique, points: uniquePoints },
    repeatObservations: { count: repeats, points: repeatPoints },
    milestonesReached: { count: milestonesReached, points: milestonePoints },
    total: uniquePoints + repeatPoints + milestonePoints,
  }
}
