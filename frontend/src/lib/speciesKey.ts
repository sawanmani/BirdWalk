// Canonical species identity for the offline collection (Explorer League
// plan §4). The repo has no real taxonomy and must not invent a competing
// source of truth, so the BirdNET scientific name — already present on every
// prediction and backed by the shipped 6,522-label set — is the stable,
// provenanced handle. It is centralised here so a future server taxonomy
// (Track B) can be swapped in one place without touching call sites.
//
// This is deliberately NOT the common-name string: casing, whitespace and
// unicode-form differences for the same species must collapse to one key,
// while different species must never collide. A null/blank scientific name is
// treated as NOT collection-eligible (returns null).

import type { Prediction } from './types.ts'

/** Normalise a scientific-name string to a canonical key, or null. */
export function normalizeSpeciesKey(
  scientific: string | null | undefined,
): string | null {
  if (!scientific) return null
  // NFC for unicode stability, collapse internal whitespace runs to a single
  // space, trim, then case-fold. BirdNET names are simple "Genus species";
  // this makes the key robust to casing and whitespace drift without needing
  // a full Unicode casefold table.
  const norm = scientific.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
  return norm.length > 0 ? norm : null
}

/**
 * Canonical key for a prediction (or a bare scientific-name string).
 * Accepts the shapes used across the app so dedup logic has one entry point.
 */
export function canonicalSpeciesKey(
  source:
    | Pick<Prediction, 'species_scientific_name'>
    | string
    | null
    | undefined,
): string | null {
  if (source == null) return null
  if (typeof source === 'string') return normalizeSpeciesKey(source)
  return normalizeSpeciesKey(source.species_scientific_name)
}
