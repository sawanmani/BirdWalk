import { useMemo, useState } from 'react'
import { Award, Bird, Check, MapPin, Sparkles, StickyNote, Trash2 } from 'lucide-react'
import { Button, EmptyState, Kicker } from './ui.tsx'
import { cn } from '../lib/cn.ts'
import {
  buildCollection,
  clearObservations,
  deleteObservation,
  loadObservations,
  uniqueSpeciesCount,
  type Observation,
} from '../lib/observations.ts'
import { loadSessions } from '../lib/history.ts'
import { computeXp } from '../lib/xpRules.ts'
import { computeMilestones, nextMilestone } from '../lib/milestones.ts'
import {
  computeAchievementInput,
  computeAchievements,
  titleForSpeciesCount,
} from '../lib/achievements.ts'

function shortDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

export function CollectionPanel({
  onClose,
  onChanged,
}: {
  onClose: () => void
  onChanged: (observations: Observation[]) => void
}) {
  const [observations, setObservations] = useState<Observation[]>(loadObservations)
  const [confirming, setConfirming] = useState(false)

  const species = useMemo(() => buildCollection(observations), [observations])
  const uniqueCount = useMemo(() => uniqueSpeciesCount(observations), [observations])
  const xp = useMemo(() => computeXp(observations), [observations])
  const milestones = useMemo(() => computeMilestones(uniqueCount), [uniqueCount])
  const next = useMemo(() => nextMilestone(uniqueCount), [uniqueCount])
  const achievements = useMemo(
    () => computeAchievements(computeAchievementInput(observations, loadSessions())),
    [observations],
  )
  const title = useMemo(() => titleForSpeciesCount(uniqueCount), [uniqueCount])

  const refresh = (next: Observation[]) => {
    setObservations(next)
    onChanged(next)
  }

  const doDeleteOne = (id: string) => refresh(deleteObservation(id))

  const doClearAll = () => {
    clearObservations()
    refresh([])
    setConfirming(false)
  }

  // Most recent observations first, newest already prepended by the store.
  const recent = observations.slice(0, 12)

  return (
    <section
      className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6"
      aria-label="Species collection"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <Kicker>Life list</Kicker>
          <h2 className="mt-2 text-forest">Species you&rsquo;ve found</h2>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted">
        A species counts once, no matter how many times you record it. This
        lives in localStorage on this device only — nothing is uploaded, and
        clearing browser data clears it too. Deleting an observation removes it
        and recomputes the collection, milestones and XP from what remains; a
        deleted sighting is never silently kept.
      </p>

      {observations.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Bird size={28} aria-hidden />}
            title="No species saved yet"
            body="Analyse a sound, then use “Save to collection” on a result to start your life list. The journal keeps every session; the collection keeps the distinct species."
          />
        </div>
      ) : (
        <>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-sage/70 px-4 py-2 text-sm font-semibold text-forest">
            <Bird size={16} aria-hidden />
            {uniqueCount} unique {uniqueCount === 1 ? 'species' : 'species'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pine/10 px-3 py-1.5 font-medium text-pine">
              <Sparkles size={13} aria-hidden /> {xp.total} local XP
              <span className="font-normal text-muted">· this device only</span>
            </span>
            {next && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/60 px-3 py-1.5 text-muted">
                Next: {next.title} at {next.target}
              </span>
            )}
          </div>

          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Milestones">
            {milestones.map((m) => (
              <li
                key={m.id}
                title={m.blurb}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs',
                  m.achieved
                    ? 'border-pine/40 bg-pine/10 text-pine'
                    : 'border-moss/30 bg-transparent text-muted',
                )}
              >
                {m.achieved && <Check size={11} aria-hidden />}
                {m.title}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <h3 className="font-display text-lg text-forest">Achievements</h3>
            {title && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-pine">
                <Award size={14} aria-hidden /> Current title: <strong>{title.name}</strong>
              </p>
            )}
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {achievements.map((a) => (
                <li
                  key={a.id}
                  title={a.blurb}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs',
                    a.achieved
                      ? 'border-pine/40 bg-pine/10 text-pine'
                      : 'border-moss/20 bg-panel/50 text-muted',
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {a.achieved ? (
                      <Check size={12} aria-hidden />
                    ) : (
                      <Award size={12} aria-hidden />
                    )}
                    <span className="font-medium">{a.title}</span>
                  </span>
                  <span className="tabular-nums">
                    {a.progress}/{a.target}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              Recomputed from this device&rsquo;s data — species found, your own
              recordings, missions completed, broad areas you typed, and days
              since your first find. Nothing is uploaded, and there are no
              daily-open streaks by design.
            </p>
          </div>

          <ul className="mt-5 flex flex-col gap-3">
            {species.map((s) => (
              <li key={s.speciesKey} className="card-field px-5 py-4 text-sm">
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <Bird size={16} aria-hidden className="text-forest" />
                    {s.speciesCommonName}
                  </span>
                  {s.userConfirmed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-pine/15 px-2.5 py-1 text-xs font-medium text-pine">
                      <Check size={12} aria-hidden /> confirmed
                    </span>
                  )}
                </p>
                {s.speciesScientificName && (
                  <p className="mt-0.5 text-xs italic text-muted">
                    {s.speciesScientificName}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted">
                  Seen {s.sightingCount} {s.sightingCount === 1 ? 'time' : 'times'}{' '}
                  · first {shortDate(s.firstSeen)} · best model score{' '}
                  <span className="tabular-nums">{s.bestModelScore.toFixed(2)}</span>
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <h3 className="font-display text-lg text-forest">Recent observations</h3>
            <p className="mt-1 text-xs text-muted">
              Individual saves, newest first. A model score is the raw
              classifier output — not accuracy and not a verified sighting.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {recent.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-moss/20 bg-panel/60 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">
                      {o.speciesCommonName}
                      {o.identificationStatus === 'user_confirmed' && ' ✓'}
                      {o.isDemoFixture && ' (demo)'}
                    </span>
                    <span className="block text-xs text-muted">
                      {shortDate(o.observedAt)} · {o.source} · score{' '}
                      <span className="tabular-nums">{o.modelScore.toFixed(2)}</span>
                    </span>
                    {(o.notes || o.coarseLocation) && (
                      <span className="mt-1 flex flex-col gap-0.5 text-xs text-muted">
                        {o.notes && (
                          <span className="inline-flex items-center gap-1">
                            <StickyNote size={11} aria-hidden /> {o.notes}
                          </span>
                        )}
                        {o.coarseLocation && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} aria-hidden /> {o.coarseLocation}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => doDeleteOne(o.id)}
                    aria-label={`Delete ${o.speciesCommonName} observation`}
                    className="shrink-0 rounded-full p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            {confirming ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-ink">
                  Delete your entire collection on this device?
                </p>
                <Button variant="secondary" onClick={doClearAll}>
                  Yes, delete
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Keep
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setConfirming(true)}>
                <Trash2 size={15} aria-hidden /> Clear collection
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
