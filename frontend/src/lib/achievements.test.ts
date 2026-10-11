import test from 'node:test'
import assert from 'node:assert/strict'

import {
  computeAchievementInput,
  computeAchievements,
  titleForSpeciesCount,
  TITLES,
} from './achievements.ts'
import type { Observation } from './observations.ts'
import type { SessionRecord } from './history.ts'

function obs(p: Partial<Observation> & Pick<Observation, 'speciesKey'>): Observation {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    speciesKey: p.speciesKey,
    speciesCommonName: p.speciesCommonName ?? 'X',
    speciesScientificName: p.speciesScientificName ?? null,
    observedAt: p.observedAt ?? '2026-01-01T00:00:00.000Z',
    source: p.source ?? 'sample',
    modelScore: p.modelScore ?? 0.5,
    identificationStatus: p.identificationStatus ?? 'ai_suggested',
    isDemoFixture: p.isDemoFixture ?? false,
    ...(p.notes ? { notes: p.notes } : {}),
    ...(p.coarseLocation ? { coarseLocation: p.coarseLocation } : {}),
  }
}

function session(missionCompleted: boolean): SessionRecord {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: '2026-01-01T00:00:00.000Z',
    source: 'sample',
    topPrediction: null,
    uncertain: false,
    missionCompleted,
    isDemoFixture: false,
  }
}

const NOW = Date.parse('2026-02-01T00:00:00.000Z')

test('input derives species, confirmed, audio, missions, regions, age', () => {
  const obsList = [
    obs({ speciesKey: 'a b', source: 'recording', identificationStatus: 'user_confirmed', observedAt: '2026-01-25T00:00:00.000Z', coarseLocation: 'park' }),
    obs({ speciesKey: 'c d', source: 'recording', observedAt: '2026-01-01T00:00:00.000Z', coarseLocation: 'garden' }),
    obs({ speciesKey: 'e f', source: 'sample', observedAt: '2026-01-20T00:00:00.000Z' }),
  ]
  const i = computeAchievementInput(obsList, [session(true), session(true), session(false)], NOW)
  assert.equal(i.species, 3)
  assert.equal(i.confirmedSpecies, 1)
  assert.equal(i.audioSpecies, 2) // recording/upload only, excludes the 'sample'
  assert.equal(i.missionsCompleted, 2)
  assert.equal(i.broadAreas, 2)
  assert.equal(i.ageDays, 31) // 2026-01-01 → 2026-02-01
})

test('empty data yields zero metrics and no achievements', () => {
  const i = computeAchievementInput([], [], NOW)
  assert.equal(i.species, 0)
  assert.equal(i.ageDays, 0)
  assert.ok(computeAchievements(i).every((a) => !a.achieved))
})

test('backyard explorer unlocks at 5 species', () => {
  const list = Array.from({ length: 5 }, (_, k) => obs({ speciesKey: `s${k} x` }))
  const ach = computeAchievements(computeAchievementInput(list, [], NOW))
  const be = ach.find((a) => a.id === 'backyard-explorer')!
  assert.equal(be.achieved, true)
})

test('weekend naturalist needs 4 completed missions', () => {
  const sessions = [session(true), session(true), session(true), session(true)]
  const ach = computeAchievements(computeAchievementInput([], sessions, NOW))
  assert.equal(ach.find((a) => a.id === 'weekend-naturalist')!.achieved, true)
})

test('progress is capped at target', () => {
  const list = Array.from({ length: 30 }, (_, k) => obs({ speciesKey: `s${k} x` }))
  const ach = computeAchievements(computeAchievementInput(list, [], NOW))
  const be = ach.find((a) => a.id === 'backyard-explorer')!
  assert.equal(be.progress, 5, 'progress clamps to target')
})

test('recompute is idempotent', () => {
  const list = [obs({ speciesKey: 'a b' }), obs({ speciesKey: 'a b' })]
  const a = computeAchievements(computeAchievementInput(list, [], NOW))
  assert.deepEqual(a, computeAchievements(computeAchievementInput(list, [], NOW)))
})

test('title tiers unlock by species count', () => {
  assert.equal(titleForSpeciesCount(0), null)
  assert.equal(titleForSpeciesCount(1)?.id, 'beginner-birder')
  assert.equal(titleForSpeciesCount(6)?.id, 'feather-collector')
  assert.equal(titleForSpeciesCount(150)?.id, 'birdwalk-legend')
})

test('titles are ordered ascending by requirement', () => {
  for (let k = 1; k < TITLES.length; k++) {
    assert.ok(TITLES[k].requiredSpecies > TITLES[k - 1].requiredSpecies)
  }
})
