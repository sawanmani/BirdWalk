import test from 'node:test'
import assert from 'node:assert/strict'

import {
  rankBoard,
  formatXp,
  DEMO_PEERS,
  type LeaderboardEntry,
} from './leaderboard.ts'

const you: LeaderboardEntry = {
  id: 'you',
  name: 'You (this device)',
  country: 'IN',
  uniqueSpecies: 42,
  xp: 1050,
  weeklyXp: 90,
  isYou: true,
}

const all = [...DEMO_PEERS, you]

test('ranks by XP descending with You included', () => {
  const board = rankBoard(all, { scope: 'global', metric: 'xp' })
  assert.equal(board[0].name, 'NatureNinja')
  assert.equal(board[board.length - 1].name, 'You (this device)')
  assert.equal(board.length, DEMO_PEERS.length + 1)
})

test('species metric ranks by unique species', () => {
  const board = rankBoard(all, { scope: 'global', metric: 'species' })
  assert.equal(board[0].uniqueSpecies, 186)
})

test('weekly metric uses weeklyXp', () => {
  const board = rankBoard([you, { ...DEMO_PEERS[1] }], { scope: 'weekly' })
  assert.equal(board[0].name, 'FeatherHunter') // weeklyXp 340 > 90
})

test('country scope keeps only matching peers plus You', () => {
  const board = rankBoard(all, { scope: 'country', country: 'IN' })
  const countries = new Set(board.map((e) => e.country))
  assert.equal(countries.has('US'), false)
  assert.ok(board.some((e) => e.isYou))
})

test('deterministic name tie-break', () => {
  const a: LeaderboardEntry = { id: 'a', name: 'Alice', country: 'US', uniqueSpecies: 1, xp: 100 }
  const b: LeaderboardEntry = { id: 'b', name: 'Bob', country: 'US', uniqueSpecies: 1, xp: 100 }
  assert.equal(rankBoard([b, a])[0].name, 'Alice')
})

test('formatXp groups thousands', () => {
  assert.equal(formatXp(1050), '1,050')
  assert.equal(formatXp(4820), '4,820')
})

test('all demo peers are explicitly flagged as demo', () => {
  assert.ok(DEMO_PEERS.every((p) => p.isDemo))
})
