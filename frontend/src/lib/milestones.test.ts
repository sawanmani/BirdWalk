import test from 'node:test'
import assert from 'node:assert/strict'

import { computeMilestones, nextMilestone, MILESTONES } from './milestones.ts'

test('no milestones achieved at zero species', () => {
  assert.ok(computeMilestones(0).every((m) => !m.achieved))
})

test('milestones unlock exactly at their thresholds', () => {
  const at1 = computeMilestones(1).find((m) => m.id === 'first-feather')!
  assert.equal(at1.achieved, true)
  const at4 = computeMilestones(4).find((m) => m.id === 'backyard-explorer')!
  assert.equal(at4.achieved, false, '5 needed, 4 not enough')
  const at5 = computeMilestones(5).find((m) => m.id === 'backyard-explorer')!
  assert.equal(at5.achieved, true)
})

test('all milestones achieved at 100 unique species', () => {
  assert.ok(computeMilestones(100).every((m) => m.achieved))
})

test('recompute is idempotent (same input → same output)', () => {
  assert.deepEqual(computeMilestones(7), computeMilestones(7))
})

test('invalid / negative counts are treated as zero', () => {
  assert.ok(computeMilestones(-3).every((m) => !m.achieved))
  assert.ok(computeMilestones(Number.NaN).every((m) => !m.achieved))
})

test('nextMilestone returns the closest unachieved threshold', () => {
  assert.equal(nextMilestone(0)?.target, 1)
  assert.equal(nextMilestone(5)?.id, 'bird-collector')
  assert.equal(nextMilestone(100), null, 'all achieved → no next')
})

test('milestone set matches the blueprint thresholds', () => {
  assert.deepEqual(
    MILESTONES.map((m) => m.target),
    [1, 5, 25, 50, 100],
  )
})
