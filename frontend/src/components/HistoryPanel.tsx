import { useState } from 'react'
import { BookOpen, Trash2 } from 'lucide-react'
import { Button, EmptyState, Kicker } from './ui.tsx'
import { clearSessions, loadSessions } from '../lib/history.ts'
import type { SessionRecord } from '../lib/history.ts'

export function HistoryPanel({
  onClose,
  onChanged,
}: {
  onClose: () => void
  onChanged: (sessions: SessionRecord[]) => void
}) {
  const [sessions, setSessions] = useState<SessionRecord[]>(loadSessions)
  const [confirming, setConfirming] = useState(false)

  const doClear = () => {
    clearSessions()
    setSessions([])
    onChanged([])
    setConfirming(false)
  }

  return (
    <section
      className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6"
      aria-label="Journal"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <Kicker>Field journal</Kicker>
          <h2 className="mt-2 text-forest">This browser only</h2>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted">
        Entries live in localStorage on this device. Nothing is uploaded
        anywhere; clearing browser data clears this too.
      </p>

      {sessions.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<BookOpen size={28} aria-hidden />}
            title="No entries yet"
            body="Analyse a sound and complete a mission — it will appear here as one short line, not a feed."
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {sessions.map((s) => (
            <li key={s.id} className="card-field px-5 py-4 text-sm">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  {s.topPrediction
                    ? s.topPrediction.species_common_name
                    : 'No reliable match'}
                  {s.isDemoFixture && ' (demo fixture)'}
                </span>
                <span className="text-xs text-muted">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
              </p>
              {s.mission && (
                <p className="mt-1 text-xs text-muted">
                  Mission: “{s.mission.title}” ·{' '}
                  {s.missionCompleted ? 'completed ✓' : 'not completed'}
                </p>
              )}
              {s.sourceLabel && (
                <p className="mt-1 text-xs text-muted">
                  Source label (smoke test only): {s.sourceLabel}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {sessions.length > 0 && (
        <div className="mt-6">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink">
                Delete all journal entries on this device?
              </p>
              <Button variant="secondary" onClick={doClear}>
                Yes, delete
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              <Trash2 size={15} aria-hidden /> Clear all entries
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
