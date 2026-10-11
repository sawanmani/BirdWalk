import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Binoculars, Eye, Wind, Footprints, Volume2, Pause } from 'lucide-react'
import { Button, Kicker, StatusBanner } from './ui.tsx'
import type { Mission, MissionCategory } from '../lib/types.ts'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'

const ICONS: Record<MissionCategory, typeof Eye> = {
  listen: Volume2,
  watch: Eye,
  stillness: Pause,
  breathe: Wind,
  walk: Footprints,
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const rem = s % 60
  return m > 0 ? `${m}m ${rem.toString().padStart(2, '0')}s` : `${rem}s`
}

export function MissionPanel({
  mission,
  generatedBy,
  onStart,
  onBackHome,
}: {
  mission: Mission
  generatedBy: string
  onStart: () => void
  onBackHome: () => void
}) {
  const reduced = useReducedMotion()
  const Icon = ICONS[mission.category] ?? Binoculars

  return (
    <motion.section
      initial={reduced ? undefined : { opacity: 0, y: 12 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6"
      aria-label="Your mission"
    >
      <Kicker>Your mission</Kicker>
      <div className="card-field mt-4 border-pine/40 bg-panel/90 px-7 py-9">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-full bg-sage text-forest"
        >
          <Icon size={24} />
        </span>
        <h2 className="mt-5 font-display text-2xl leading-tight text-forest">
          {mission.title}
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-ink">
          {mission.instruction}
        </p>
        <p className="mt-4 text-sm text-muted">
          About {formatSeconds(mission.duration_seconds)} · then put the
          phone down.
        </p>
        <p className="mt-2 text-sm text-muted">
          <span className="font-semibold">Cannot walk or hear well?</span>{' '}
          {mission.accessibility_note}
        </p>
        {generatedBy !== 'deterministic_template' && (
          <p className="mt-3 text-xs text-muted">
            Mission text drafted by a local Gemma model, then checked.
            Templates are always the fallback.
          </p>
        )}
      </div>

      <div className="mt-7 flex flex-wrap gap-4">
        <Button onClick={onStart}>Start — I'll pocket the phone</Button>
        <Button variant="secondary" onClick={onBackHome}>
          Not now
        </Button>
      </div>
    </motion.section>
  )
}

// "Phone away" mode: intentionally near-empty. A single dim line of text
// and a discreet finish control. No animation, no feed, nothing to scroll.
export function PhoneAwayMode({
  mission,
  onComplete,
  onSkip,
}: {
  mission: Mission
  onComplete: () => void
  onSkip: () => void
}) {
  const [remaining, setRemaining] = useState(mission.duration_seconds)
  const [timerOn, setTimerOn] = useState(false)
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    if (!timerOn) return
    // Finishing is handled inside the timeout callback — an event — rather than
    // in the effect body, so the last tick does not start a cascading render.
    const t = window.setTimeout(() => {
      const next = remaining - 1
      setRemaining(next)
      if (next <= 0) {
        setTimerOn(false)
        setElapsed(true)
      }
    }, 1000)
    return () => window.clearTimeout(t)
  }, [timerOn, remaining])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-forest px-6 text-center text-paper">
      <p className="max-w-md font-display text-2xl leading-relaxed">
        {mission.title}
      </p>
      {timerOn && (
        <p className="tabular-nums text-sm text-sage" aria-live="polite">
          {formatSeconds(remaining)} left
        </p>
      )}
      {elapsed && (
        <p className="font-display text-lg text-sage" aria-live="polite">
          Time — look up. Tap done when you're ready.
        </p>
      )}
      <div className="flex flex-col items-center gap-3">
        {!timerOn && !elapsed && (
          <button
            onClick={() => {
              // A zero-length mission would never tick, so finish it from here.
              if (remaining <= 0) setElapsed(true)
              else setTimerOn(true)
            }}
            className="rounded-full border border-sage/40 px-5 py-2 text-sm text-sage hover:bg-pine"
          >
            Quiet timer ({formatSeconds(mission.duration_seconds)})
          </button>
        )}
        <button
          onClick={onComplete}
          className="mt-4 rounded-full bg-sunlit px-7 py-3 font-semibold text-forest hover:bg-sunlit/90"
        >
          I did it — done
        </button>
        <button
          onClick={onSkip}
          className="min-h-0 text-xs text-sage/70 underline underline-offset-4"
        >
          Back to screen
        </button>
      </div>
    </div>
  )
}

export function MissionComplete({ mission }: { mission: Mission }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <StatusBanner tone="info">
          Logged locally as "{mission.title}". Stored in this browser's
          journal only — nothing was uploaded.
        </StatusBanner>
      </div>
    </div>
  )
}
