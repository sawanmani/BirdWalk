import { useMemo, useState } from 'react'
import { Bird, Crown, Sparkles, Trophy } from 'lucide-react'
import { Button, Kicker, StatusBanner } from './ui.tsx'
import { cn } from '../lib/cn.ts'
import { loadObservations, uniqueSpeciesCount } from '../lib/observations.ts'
import { computeXp } from '../lib/xpRules.ts'
import { loadSessions } from '../lib/history.ts'
import {
  rankBoard,
  formatXp,
  DEMO_PEERS,
  type LeaderboardEntry,
  type LeaderboardScope,
  type Metric,
} from '../lib/leaderboard.ts'

const SCOPES: LeaderboardScope[] = ['global', 'country', 'weekly', 'alltime']
const SCOPE_LABEL: Record<LeaderboardScope, string> = {
  global: 'Global',
  country: 'Country',
  weekly: 'Weekly',
  alltime: 'All-time',
}
const MEDALS = ['🥇', '🥈', '🥉']

export function LeaderboardPanel({ onClose }: { onClose: () => void }) {
  const observations = useMemo(() => loadObservations(), [])
  const sessions = useMemo(() => loadSessions(), [])

  const [scope, setScope] = useState<LeaderboardScope>('global')
  const [metric, setMetric] = useState<Metric>('xp')
  const [country, setCountry] = useState('IN')

  // The only REAL data here is "You": computed from this device's collection.
  const uniqueCount = useMemo(() => uniqueSpeciesCount(observations), [observations])
  const you = useMemo<LeaderboardEntry>(() => {
    const weekAgo = Date.now() - 7 * 86_400_000
    const weekly = computeXp(
      observations.filter((o) => {
        const t = Date.parse(o.observedAt)
        return !Number.isNaN(t) && t >= weekAgo
      }),
    ).total
    return {
      id: 'you',
      name: 'You (this device)',
      country,
      uniqueSpecies: uniqueCount,
      xp: computeXp(observations).total,
      weeklyXp: weekly,
      isYou: true,
    }
  }, [observations, uniqueCount, country])

  // sessions is read so the "missions completed" context stays honest if shown.
  void sessions

  const board = useMemo(
    () => rankBoard([...DEMO_PEERS, you], { scope, country, metric }),
    [scope, country, metric, you],
  )

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6" aria-label="Leaderboard">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Kicker>Explorer League</Kicker>
          <h2 className="mt-2 flex items-center gap-2 text-forest">
            <Trophy size={22} aria-hidden /> Leaderboard
          </h2>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-4">
        <StatusBanner tone="fixture">
          <strong>Demo board — not a live global leaderboard.</strong> The other
          explorers below are illustrative sample data, not real users or real
          rankings. A genuine global/country/weekly board needs user accounts +
          a server that computes scores (Track B), which is intentionally not
          built here. <strong>Your row is real</strong> — it reflects this
          device&rsquo;s local collection &amp; XP only.
        </StatusBanner>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {SCOPES.map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              scope === s
                ? 'bg-forest text-paper'
                : 'border border-moss/30 text-pine hover:bg-sage/60',
            )}
          >
            {SCOPE_LABEL[s]}
            {s !== 'alltime' && (
              <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">demo</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted">Sort by</span>
        {(['xp', 'species'] as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={cn(
              'rounded-full px-3 py-1 font-medium',
              metric === m ? 'bg-pine/15 text-pine' : 'text-muted hover:bg-sage/50',
            )}
          >
            {m === 'xp' ? 'Explorer XP' : 'Unique species'}
          </button>
        ))}
        {scope === 'country' && (
          <label className="ml-auto inline-flex items-center gap-1.5 text-muted">
            Region (illustrative)
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-md border border-moss/30 bg-panel/80 px-2 py-1 text-ink"
            >
              {['IN', 'US', 'GB', 'JP', 'DE'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="mt-2 text-xs text-muted">
        Country &amp; weekly scopes are sample-only until a backend exists; your
        country here is a display choice, never read from your device.
      </p>

      <ul className="mt-5 flex flex-col gap-2">
        {board.map((row) => (
          <li
            key={row.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
              row.isYou
                ? 'border-pine/50 bg-pine/10'
                : 'border-moss/20 bg-panel/60',
            )}
          >
            <span className="w-8 shrink-0 text-center text-base font-semibold tabular-nums text-forest">
              {row.rank <= 3 && scope !== 'weekly' ? (
                MEDALS[row.rank - 1]
              ) : (
                row.rank
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-medium text-ink">
                {row.isYou ? <Sparkles size={14} aria-hidden className="text-pine" /> : null}
                <span className="truncate">{row.name}</span>
                {row.isYou && (
                  <span className="rounded-full bg-pine/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pine">
                    real
                  </span>
                )}
                {row.isDemo && (
                  <span className="rounded-full bg-moss/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    sample
                  </span>
                )}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <Bird size={11} aria-hidden />
                {row.uniqueSpecies} unique
                {row.country ? <> · {row.country}</> : null}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-semibold tabular-nums text-forest">
                {formatXp(scope === 'weekly' ? (row.weeklyXp ?? 0) : row.xp)}
              </span>
              <span className="block text-[10px] uppercase tracking-wide text-muted">
                {scope === 'weekly' ? 'XP this wk' : 'XP'}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 flex items-center gap-1.5 text-xs text-muted">
        <Crown size={13} aria-hidden />
        Only your row is computed from real local data. To make the rest real,
        BirdWalk would need accounts, a database, and server-side scoring.
      </p>
    </section>
  )
}
