import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCollection,
  uniqueSpeciesCount,
  type Observation,
} from './observations.ts'

function obs(overrides: Partial<Observation> & Pick<Observation, 'speciesKey' | 'speciesCommonName'>): Observation {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    speciesKey: overrides.speciesKey,
    speciesCommonName: overrides.speciesCommonName,
    speciesScientificName: overrides.speciesScientificName ?? overrides.speciesCommonName,
    observedAt: overrides.observedAt ?? '2026-01-01T00:00:00.000Z',
    source: overrides.source ?? 'sample',
    modelScore: overrides.modelScore ?? 0.5,
    identificationStatus: overrides.identificationStatus ?? 'ai_suggested',
    isDemoFixture: overrides.isDemoFixture ?? false,
  }
}

test('duplicate species collapse into one collection entry', () => {
  const list = [
    obs({ speciesKey: 'pycnonotus jocosus', speciesCommonName: 'Red-whiskered Bulbul' }),
    obs({ speciesKey: 'pycnonotus jocosus', speciesCommonName: 'Red-whiskered Bulbul', modelScore: 0.9 }),
    obs({ speciesKey: 'eudynamys scolopaceus', speciesCommonName: 'Asian Koel' }),
  ]
  const col = buildCollection(list)
  assert.equal(col.length, 2)
  assert.equal(uniqueSpeciesCount(list), 2)
  const bulbul = col.find((c) => c.speciesKey === 'pycnonotus jocosus')!
  assert.equal(bulbul.sightingCount, 2)
  assert.equal(bulbul.bestModelScore, 0.9, 'keeps the highest raw model score')
})

test('observations with a null species key are not collection-eligible', () => {
  const list = [
    obs({ speciesKey: null, speciesCommonName: 'Unknown' }),
    obs({ speciesKey: 'parus major', speciesCommonName: 'Great Tit' }),
  ]
  assert.equal(uniqueSpeciesCount(list), 1)
  assert.equal(buildCollection(list).length, 1)
})

test('whiskered and vented bulbul never collide (regression: cafer vs jocosus)', () => {
  const list = [
    obs({ speciesKey: 'pycnonotus jocosus', speciesCommonName: 'Red-whiskered Bulbul' }),
    obs({ speciesKey: 'pycnonotus cafer', speciesCommonName: 'Red-vented Bulbul' }),
  ]
  assert.equal(uniqueSpeciesCount(list), 2)
})

test('firstSeen/lastSeen track earliest and latest observation', () => {
  const list = [
    obs({ speciesKey: 'apus affinis', speciesCommonName: 'Indian Swiftlet', observedAt: '2026-03-01T00:00:00.000Z' }),
    obs({ speciesKey: 'apus affinis', speciesCommonName: 'Indian Swiftlet', observedAt: '2026-01-01T00:00:00.000Z' }),
    obs({ speciesKey: 'apus affinis', speciesCommonName: 'Indian Swiftlet', observedAt: '2026-05-01T00:00:00.000Z' }),
  ]
  const [entry] = buildCollection(list)
  assert.equal(entry.firstSeen, '2026-01-01T00:00:00.000Z')
  assert.equal(entry.lastSeen, '2026-05-01T00:00:00.000Z')
})

test('a species counts as confirmed once any observation is user-confirmed', () => {
  const list = [
    obs({ speciesKey: 'corvus splendens', speciesCommonName: 'House Crow', identificationStatus: 'ai_suggested' }),
    obs({ speciesKey: 'corvus splendens', speciesCommonName: 'House Crow', identificationStatus: 'user_confirmed' }),
  ]
  const [entry] = buildCollection(list)
  assert.equal(entry.userConfirmed, true)
  assert.equal(entry.sightingCount, 2)
})

test('collection is sorted most-recently-discovered first', () => {
  const list = [
    obs({ speciesKey: 'a b', speciesCommonName: 'Old', observedAt: '2020-01-01T00:00:00.000Z' }),
    obs({ speciesKey: 'c d', speciesCommonName: 'New', observedAt: '2026-01-01T00:00:00.000Z' }),
  ]
  const col = buildCollection(list)
  assert.equal(col[0].speciesKey, 'c d')
})
