// Local-only species collection (Explorer League Track A, Phase 1).
//
// This LAYERS ON TOP OF the existing session journal (`history.ts`), it does
// not replace it: the journal still auto-saves every analysis, while an
// observation is only added when the user explicitly chooses "Save to
// collection". Same privacy posture as the journal — localStorage on this
// device, no account, no network, best-effort (a throwing storage must never
// break identification).
//
// Honesty rules preserved from the base app:
//   * It is always "modelScore" (the raw classifier score), never
//     "accuracy"/"confidence"/"probability".
//   * `identificationStatus` keeps the AI suggestion distinct from a genuine
//     user confirmation. Nothing is auto-marked confirmed.

import { newId } from './history.ts'
import { canonicalSpeciesKey } from './speciesKey.ts'
import type { Prediction } from './types.ts'

export type IdentificationStatus = 'ai_suggested' | 'user_confirmed'
export type ObservationSource = 'recording' | 'upload' | 'sample'

export interface Observation {
  id: string
  /** Canonical dedup key (normalised scientific name); null = not eligible. */
  speciesKey: string | null
  speciesCommonName: string
  speciesScientificName: string | null
  observedAt: string
  source: ObservationSource
  /** Raw BirdNET score. NOT renamed to confidence/accuracy. */
  modelScore: number
  identificationStatus: IdentificationStatus
  isDemoFixture: boolean
  /** Optional free text, only if the user adds it. */
  notes?: string
  /** Optional coarse location, only after an explicit user action. Never auto. */
  coarseLocation?: string
}

const KEY = 'birdwalk.observations.v1'
const CAP = 200

// --- Best-effort storage (mirrors history.ts) -----------------------------

export function loadObservations(): Observation[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Observation[]) : []
  } catch {
    return []
  }
}

function persist(list: Observation[]): Observation[] {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage full or blocked; collection is best-effort only */
  }
  return list
}

/** Upsert by id (replace-if-exists), newest first, capped. Stable under retry. */
export function saveObservation(record: Observation): Observation[] {
  const existing = loadObservations()
  const without = existing.filter((o) => o.id !== record.id)
  return persist([record, ...without].slice(0, CAP))
}

/** Flip an ai_suggested observation to user_confirmed (replace-by-id). */
export function confirmObservation(id: string): Observation[] {
  const next = loadObservations().map((o) =>
    o.id === id ? { ...o, identificationStatus: 'user_confirmed' as const } : o,
  )
  return persist(next)
}

export function deleteObservation(id: string): Observation[] {
  return persist(loadObservations().filter((o) => o.id !== id))
}

export function clearObservations(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

// --- Construction ---------------------------------------------------------

export function observationFromPrediction({
  prediction,
  source,
  observedAt,
  isDemoFixture,
  identificationStatus = 'ai_suggested',
  notes,
  coarseLocation,
}: {
  prediction: Prediction
  source: ObservationSource
  observedAt: string
  isDemoFixture: boolean
  identificationStatus?: IdentificationStatus
  /** Optional, only when the user typed it. Blank -> undefined. */
  notes?: string
  /** Optional BROAD area the user chose to add. Never auto/GPS. Blank -> undefined. */
  coarseLocation?: string
}): Observation {
  const cleanNotes = notes?.trim()
  const cleanLoc = coarseLocation?.trim()
  return {
    id: newId(),
    speciesKey: canonicalSpeciesKey(prediction),
    speciesCommonName: prediction.species_common_name,
    speciesScientificName: prediction.species_scientific_name,
    observedAt,
    source,
    modelScore: prediction.model_score,
    identificationStatus,
    isDemoFixture,
    ...(cleanNotes ? { notes: cleanNotes } : {}),
    ...(cleanLoc ? { coarseLocation: cleanLoc } : {}),
  }
}

// --- Pure derived collection logic (no storage, unit-testable) ------------

export interface CollectionSpecies {
  speciesKey: string
  speciesCommonName: string
  speciesScientificName: string | null
  firstSeen: string
  lastSeen: string
  sightingCount: number
  /** Highest model score ever seen for this species (raw score). */
  bestModelScore: number
  /** True once any observation of this species is user-confirmed. */
  userConfirmed: boolean
}

/**
 * Deduplicate a raw observation list into one entry per canonical species.
 * Rule (plan §Phase 1): a species counts ONCE; the representative name is
 * taken from a user_confirmed observation when one exists, else the earliest.
 * Observations with a null speciesKey are excluded (not collection-eligible).
 * Pure: given the same input it always returns the same output.
 */
export function buildCollection(
  observations: Observation[],
): CollectionSpecies[] {
  const map = new Map<string, CollectionSpecies>()
  for (const o of observations) {
    if (!o.speciesKey) continue
    const confirmed = o.identificationStatus === 'user_confirmed'
    const existing = map.get(o.speciesKey)
    if (!existing) {
      map.set(o.speciesKey, {
        speciesKey: o.speciesKey,
        speciesCommonName: o.speciesCommonName,
        speciesScientificName: o.speciesScientificName,
        firstSeen: o.observedAt,
        lastSeen: o.observedAt,
        sightingCount: 1,
        bestModelScore: o.modelScore,
        userConfirmed: confirmed,
      })
      continue
    }
    existing.sightingCount += 1
    if (o.observedAt < existing.firstSeen) existing.firstSeen = o.observedAt
    if (o.observedAt > existing.lastSeen) existing.lastSeen = o.observedAt
    if (o.modelScore > existing.bestModelScore) existing.bestModelScore = o.modelScore
    // Prefer a confirmed observation's naming as the representative label.
    if (confirmed && !existing.userConfirmed) {
      existing.userConfirmed = true
      existing.speciesCommonName = o.speciesCommonName
      existing.speciesScientificName = o.speciesScientificName
    }
  }
  // Most recently discovered species first.
  return [...map.values()].sort((a, b) => (a.firstSeen < b.firstSeen ? 1 : -1))
}

/** Number of distinct collection-eligible species seen. */
export function uniqueSpeciesCount(observations: Observation[]): number {
  const keys = new Set<string>()
  for (const o of observations) if (o.speciesKey) keys.add(o.speciesKey)
  return keys.size
}
