// Explorer League — leaderboard (local-first, HONEST about what is not live).
//
// A REAL global leaderboard needs user accounts + a server that computes score
// authoritatively (Track B). We deliberately do NOT pretend this is live: every
// peer below is clearly-marked illustrative demo data, and the panel renders a
// persistent "not a live global leaderboard" banner. This module is pure +
// deterministic so it is unit-testable and cannot silently drift.

export type LeaderboardScope = 'global' | 'country' | 'weekly' | 'alltime'
export type Metric = 'xp' | 'species'

export interface LeaderboardEntry {
  id: string
  name: string
  country: string
  uniqueSpecies: number
  xp: number
  weeklyXp?: number
  isYou?: boolean
  isDemo?: boolean
}

export interface RankedEntry extends LeaderboardEntry {
  rank: number
}

/** Scope availability drives the honest UI: weekly/friends need a backend. */
export const SCOPE_INFO: Record<LeaderboardScope, { label: string; requiresBackend: boolean }> = {
  global: { label: 'Global', requiresBackend: true },
  country: { label: 'Country', requiresBackend: true },
  weekly: { label: 'Weekly', requiresBackend: true },
  alltime: { label: 'All-time', requiresBackend: false },
}

export function formatXp(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

/**
 * Illustrative demo peers ONLY. Not real users, not live rankings. The panel
 * labels these rows as sample data next to your real local profile.
 */
export const DEMO_PEERS: LeaderboardEntry[] = [
  { id: 'p1', name: 'NatureNinja', country: 'JP', uniqueSpecies: 186, xp: 4820, weeklyXp: 210, isDemo: true },
  { id: 'p2', name: 'FeatherHunter', country: 'US', uniqueSpecies: 154, xp: 3950, weeklyXp: 340, isDemo: true },
  { id: 'p3', name: 'SkyWatcher', country: 'GB', uniqueSpecies: 121, xp: 3210, weeklyXp: 150, isDemo: true },
  { id: 'p4', name: 'BirdExplorer', country: 'IN', uniqueSpecies: 87, xp: 2180, weeklyXp: 90, isDemo: true },
  { id: 'p5', name: 'LeafListener', country: 'IN', uniqueSpecies: 61, xp: 1610, weeklyXp: 120, isDemo: true },
  { id: 'p6', name: 'DawnChorus', country: 'DE', uniqueSpecies: 44, xp: 1180, weeklyXp: 60, isDemo: true },
]

export interface RankOptions {
  scope?: LeaderboardScope
  country?: string
  metric?: Metric
}

/** Sort by the metric (desc) with a deterministic name tie-break; assign ranks. */
export function rankBoard(entries: LeaderboardEntry[], opts: RankOptions = {}): RankedEntry[] {
  const { scope = 'global', country, metric = 'xp' } = opts
  const value = (e: LeaderboardEntry): number =>
    metric === 'species' ? e.uniqueSpecies : scope === 'weekly' ? (e.weeklyXp ?? 0) : e.xp

  const pool = entries.filter((e) => {
    if (scope === 'country') return e.isYou || e.country === country
    return true
  })

  const sorted = [...pool].sort((a, b) => {
    const diff = value(b) - value(a)
    return diff !== 0 ? diff : a.name.localeCompare(b.name)
  })

  return sorted.map((e, i) => ({ ...e, rank: i + 1 }))
}
