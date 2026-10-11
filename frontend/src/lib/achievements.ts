// Explorer League — achievements & titles (derived, local-first, honest).
//
// Everything here is RECOMPUTED from authoritative local data (observations +
// session history), never from counters, so it is idempotent and survives a
// reload. Badges that would need a source we deliberately don't have (real
// species rarity, verified status, other users) are NOT invented.
//
// Grounding in the pasted vision doc (§5) while respecting the locked rules:
//   * "Sound Detective" uses the user's OWN captured audio (recording/upload),
//     not curated demo samples — so it's a real "you recorded 10 species" badge.
//   * "Regional Explorer" counts distinct OPTIONAL broad areas the user typed
//     (never GPS/precise location).
//   * "BirdWalk Veteran" is collection LONGEVITY (days since first discovery),
//     explicitly not daily-app-open streaks (anti-dark-pattern rule).

import { uniqueSpeciesCount, type Observation, type ObservationSource } from './observations.ts'
import type { SessionRecord } from './history.ts'

export type AchievementKind = 'confirmed' | 'species' | 'audio' | 'missions' | 'regions' | 'longevity'

export interface AchievementInput {
  species: number
  confirmedSpecies: number
  audioSpecies: number
  missionsCompleted: number
  broadAreas: number
  ageDays: number
}

export interface AchievementDef {
  id: string
  title: string
  kind: AchievementKind
  target: number
  blurb: string
}

export interface Achievement extends AchievementDef {
  achieved: boolean
  progress: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-feather', title: 'First Feather', kind: 'confirmed', target: 1, blurb: 'Confirm your very first species.' },
  { id: 'backyard-explorer', title: 'Backyard Explorer', kind: 'species', target: 5, blurb: 'Find 5 unique species.' },
  { id: 'sound-detective', title: 'Sound Detective', kind: 'audio', target: 10, blurb: 'Record 10 different species yourself.' },
  { id: 'bird-collector', title: 'Bird Collector', kind: 'species', target: 25, blurb: 'Collect 25 unique species.' },
  { id: 'nature-enthusiast', title: 'Nature Enthusiast', kind: 'species', target: 50, blurb: 'Collect 50 unique species.' },
  { id: 'weekend-naturalist', title: 'Weekend Naturalist', kind: 'missions', target: 4, blurb: 'Complete 4 outdoor missions.' },
  { id: 'regional-explorer', title: 'Regional Explorer', kind: 'regions', target: 5, blurb: 'Spot birds across 5 broad areas.' },
  { id: 'birdwalk-veteran', title: 'BirdWalk Veteran', kind: 'longevity', target: 30, blurb: 'Keep a collection for 30 days.' },
]

const AUDIO_SOURCES: ObservationSource[] = ['recording', 'upload']

function isoToDays(iso: string): number {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

/** Derive the raw achievement input from local observation + session data. Pure. */
export function computeAchievementInput(
  observations: Observation[],
  sessions: SessionRecord[],
  now = Date.now(),
): AchievementInput {
  const withKey = observations.filter((o) => o.speciesKey)

  const species = uniqueSpeciesCount(observations)
  const confirmedSpecies = new Set(
    withKey.filter((o) => o.identificationStatus === 'user_confirmed').map((o) => o.speciesKey as string),
  ).size
  const audioSpecies = new Set(
    withKey.filter((o) => AUDIO_SOURCES.includes(o.source)).map((o) => o.speciesKey as string),
  ).size
  const missionsCompleted = sessions.filter((s) => s.missionCompleted).length
  const broadAreas = new Set(
    observations.map((o) => o.coarseLocation?.trim()).filter((v): v is string => !!v),
  ).size

  const dated = observations.map((o) => o.observedAt).filter(Boolean).sort((a, b) => isoToDays(a) - isoToDays(b))
  const firstTs = dated.length ? Date.parse(dated[0]) : Number.NaN
  const ageDays = Number.isNaN(firstTs) ? 0 : Math.max(0, Math.floor((now - firstTs) / 86_400_000))

  return { species, confirmedSpecies, audioSpecies, missionsCompleted, broadAreas, ageDays }
}

function metricFor(kind: AchievementKind, i: AchievementInput): number {
  switch (kind) {
    case 'confirmed': return i.confirmedSpecies
    case 'species': return i.species
    case 'audio': return i.audioSpecies
    case 'missions': return i.missionsCompleted
    case 'regions': return i.broadAreas
    case 'longevity': return i.ageDays
  }
}

/** Pure: every achievement with achieved + progress, recomputed from input. */
export function computeAchievements(i: AchievementInput): Achievement[] {
  return ACHIEVEMENTS.map((a) => {
    const metric = metricFor(a.kind, i)
    return { ...a, achieved: metric >= a.target, progress: Math.min(metric, a.target) }
  })
}

export interface Title {
  id: string
  name: string
  /** Unique-species count required. */
  requiredSpecies: number
}

export const TITLES: Title[] = [
  { id: 'beginner-birder', name: 'Beginner Birder', requiredSpecies: 1 },
  { id: 'feather-collector', name: 'Feather Collector', requiredSpecies: 5 },
  { id: 'sound-detective-title', name: 'Sound Detective', requiredSpecies: 15 },
  { id: 'nature-explorer', name: 'Nature Explorer', requiredSpecies: 50 },
  { id: 'birdwalk-legend', name: 'BirdWalk Legend', requiredSpecies: 100 },
]

/** Highest title earned for a given unique-species count; null before 1. */
export function titleForSpeciesCount(speciesCount: number): Title | null {
  let earned: Title | null = null
  for (const t of TITLES) if (speciesCount >= t.requiredSpecies) earned = t
  return earned
}
