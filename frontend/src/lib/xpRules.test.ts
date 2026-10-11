import test from 'node:test'
import assert from 'node:assert/strict'

import { computeXp, XP_RULES, ACTIVE_XP_RULES } from './xpRules.ts'
import type { Observation } from './observations.ts'

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
  }
}

test('empty collection scores zero', () => {
  assert.equal(computeXp([]).total, 0)
})

test('unique species award first-discovery XP', () => {
  const list = [
    obs({ speciesKey: 'a b' }),
    obs({ speciesKey: 'c d' }),
    obs({ speciesKey: 'e f' }),
  ]
  const xp = computeXp(list)
  assert.equal(xp.uniqueSpecies.count, 3)
  assert.equal(xp.uniqueSpecies.points, 3 * XP_RULES.firstSpeciesDiscovery)
  assert.equal(xp.repeatObservations.count, 0)
})

test('repeat observations award the smaller per-sighting XP', () => {
  const list = [
    obs({ speciesKey: 'a b' }),
    obs({ speciesKey: 'a b' }),
    obs({ speciesKey: 'a b' }),
    obs({ speciesKey: 'c d' }),
  ]
  const xp = computeXp(list)
  assert.equal(xp.uniqueSpecies.count, 2)
  assert.equal(xp.repeatObservations.count, 2) // 4 eligible - 2 unique
  assert.equal(xp.repeatObservations.points, 2 * XP_RULES.repeatObservation)
})

test('one species alone unlocks First Feather only', () => {
  const xp = computeXp([obs({ speciesKey: 'a b' })])
  assert.equal(xp.milestonesReached.count, 1)
  assert.equal(xp.milestonesReached.points, XP_RULES.milestone)
})

test('observations without a canonical key never score', () => {
  const xp = computeXp([obs({ speciesKey: null }), obs({ speciesKey: null })])
  assert.equal(xp.total, 0)
  assert.equal(xp.uniqueSpecies.count, 0)
  assert.equal(xp.repeatObservations.count, 0)
})

test('total is the exact sum of the three active components', () => {
  const xp = computeXp([obs({ speciesKey: 'a b' }), obs({ speciesKey: 'a b' })])
  assert.equal(
    xp.total,
    xp.uniqueSpecies.points + xp.repeatObservations.points + xp.milestonesReached.points,
  )
})

test('recompute is idempotent and order-independent', () => {
  const a = [obs({ speciesKey: 'a b', observedAt: '2026-01-01T00:00:00.000Z' }), obs({ speciesKey: 'c d' })]
  const b = [...a].reverse()
  assert.equal(computeXp(a).total, computeXp(b).total)
  assert.deepEqual(computeXp(a), computeXp(a))
})

test('inactive rules are not part of the awarded set', () => {
  const active = ACTIVE_XP_RULES as readonly string[]
  assert.equal(active.includes('weeklyChallenge'), false)
  assert.equal(active.includes('learningQuiz'), false)
  assert.equal(active.includes('dailyMission'), false)
  assert.equal(active.includes('milestone'), true)
  assert.ok(XP_RULES.weeklyChallenge > 0, 'value exists but is deliberately never awarded locally')
})
