import { Bird, Footprints } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button, Kicker } from './ui.tsx'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'

export function Hero({
  onListen,
  onSample,
}: {
  onListen: () => void
  onSample: () => void
}) {
  const reduced = useReducedMotion()

  return (
    <section className="relative overflow-hidden">
      {/* botanical backdrop: pure CSS/SVG, no external imagery */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 90% at 85% -10%, rgb(120 147 107 / 0.28), transparent 60%), radial-gradient(90% 70% at -10% 110%, rgb(232 189 98 / 0.18), transparent 55%)',
        }}
      />
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-20">
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 14 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <Kicker>A local-first bird sound companion</Kicker>
          <h1 className="mt-4 text-forest">
            Hear the birds. Find your way back to the world.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Record three seconds of what you hear. BirdWalk matches it
            against a pretrained bird-sound model running on your own
            machine — then hands you one short mission and asks the only
            thing it cares about: that your screen goes quiet.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button onClick={onListen}>
              <Bird size={18} aria-hidden />
              Listen to a bird
            </Button>
            <Button variant="secondary" onClick={onSample}>
              Explore a sample
            </Button>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-muted">
            <Footprints size={16} aria-hidden className="text-moss" />
            The point is the walk, not the app. When the mission starts,
            the screen gets deliberately boring.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
