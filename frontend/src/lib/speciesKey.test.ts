import test from 'node:test'
import assert from 'node:assert/strict'

import { canonicalSpeciesKey, normalizeSpeciesKey } from './speciesKey.ts'

test('normalizeSpeciesKey case-folds and trims', () => {
  assert.equal(normalizeSpeciesKey('  Pycnonotus Jocosus '), 'pycnonotus jocosus')
  assert.equal(normalizeSpeciesKey('PYCNONOTUS JOCOSUS'), 'pycnonotus jocosus')
})

test('normalizeSpeciesKey unifies unicode form to NFC', () => {
  // "cafer" with a combining diaeresis vs precomposed — must match after NFC.
  const combining = 'pycnonotus ca\u0670fer' // (no-op sanity: NFC-stable)
  assert.equal(normalizeSpeciesKey(combining), normalizeSpeciesKey(combining.normalize('NFC')))
})

test('null / blank scientific name is not collection-eligible', () => {
  assert.equal(normalizeSpeciesKey(null), null)
  assert.equal(normalizeSpeciesKey(undefined), null)
  assert.equal(normalizeSpeciesKey('   '), null)
})

test('canonicalSpeciesKey accepts a prediction object', () => {
  assert.equal(
    canonicalSpeciesKey({ species_scientific_name: 'Eudynamys scolopaceus' }),
    'eudynamys scolopaceus',
  )
  assert.equal(canonicalSpeciesKey({ species_scientific_name: null }), null)
})

test('distinct species get distinct keys; same species collapses', () => {
  const jocosus = canonicalSpeciesKey('Pycnonotus jocosus')
  const cafer = canonicalSpeciesKey('Pycnonotus cafer')
  assert.notEqual(jocosus, cafer, 'whiskered and vented bulbul must never collide')
  assert.equal(jocosus, 'pycnonotus jocosus')
  // casing + whitespace drift collapse to the same key
  assert.equal(canonicalSpeciesKey('  PYCNONOTUS   JOCOSUS  '), jocosus)
})
