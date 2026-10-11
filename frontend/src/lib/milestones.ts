// Explorer League Track A — Phase 4: collection milestones.
//
// Milestones are DERIVED from authoritative collection state (the number of
// distinct species in the user's local collection) and recomputed from scratch
// every time — there is no counter to increment, so they are idempotent and
// can never drift after a reload. Thresholds come straight from the blueprint
// §Phase 4 ("First Feather", "Backyard Explorer" 5, "Bird Collector" 25,
// "Nature Enthusiast" 50). "BirdWalk Veteran" is a *sustained collection*
// milestone (100 unique species), explicitly NOT repeated app opens.
//
// Deliberately omitted for safety/honesty (plan §4): rarity bonuses and
// "endangered/sensitive species" incentives, because the repo has no reliable
// region- and season-appropriate source — encouraging users to seek rare or
// nesting birds would be unsafe.

export interface MilestoneDef {
  id: string
  title: string
  /** Unique-species count required. */
  target: number
  blurb: string
}

export interface Milestone extends MilestoneDef {
  achieved: boolean
}

export const MILESTONES: MilestoneDef[] = [
  { id: 'first-feather', title: 'First Feather', target: 1, blurb: 'Your first species in the collection.' },
  { id: 'backyard-explorer', title: 'Backyard Explorer', target: 5, blurb: 'Five different species spotted.' },
  { id: 'bird-collector', title: 'Bird Collector', target: 25, blurb: 'Twenty-five unique species.' },
  { id: 'nature-enthusiast', title: 'Nature Enthusiast', target: 50, blurb: 'Fifty species on your life list.' },
  { id: 'birdwalk-veteran', title: 'BirdWalk Veteran', target: 100, blurb: 'A sustained collection of 100 species.' },
]

/** Pure: given a unique-species count, return every milestone with achieved
 *  flags. Same input always yields the same output (idempotent recompute). */
export function computeMilestones(uniqueSpeciesCount: number): Milestone[] {
  const n = Number.isFinite(uniqueSpeciesCount) && uniqueSpeciesCount > 0 ? uniqueSpeciesCount : 0
  return MILESTONES.map((m) => ({ ...m, achieved: n >= m.target }))
}

/** The next milestone still to reach, or null if all are achieved. */
export function nextMilestone(uniqueSpeciesCount: number): Milestone | null {
  const sorted = [...MILESTONES].sort((a, b) => a.target - b.target)
  const found = sorted.find((m) => uniqueSpeciesCount < m.target)
  return found ? { ...found, achieved: false } : null
}
