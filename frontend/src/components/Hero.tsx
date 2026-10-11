import { Bird, Footprints } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { Button, Kicker } from './ui.tsx'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'
import { backendRunsOnThisMachine } from '../lib/api.ts'

const HEADLINE = 'Hear the birds. Find your way back to the world.'

// Where the model actually runs. Local development keeps the local-first
// wording; the deployed site must not claim the visitor's machine is doing the
// work, because there the audio is sent to a hosted demo backend.
const LOCAL = backendRunsOnThisMachine()
const KICKER = LOCAL
  ? 'A local-first bird sound companion'
  : 'A bird sound companion, no install'
const BLURB = LOCAL
  ? 'Record three seconds of what you hear. BirdWalk matches it against a pretrained bird-sound model running on your own machine — then hands you one short mission and asks the only thing it cares about: that your screen goes quiet.'
  : 'Record three seconds of what you hear. BirdWalk matches it against a pretrained bird-sound model on a free demo server — then hands you one short mission and asks the only thing it cares about: that your screen goes quiet.'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
}

// No `filter: blur` here — it breaks the h1's background-clip text gradient.
const word: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

/** Small "we're listening" equalizer; static (no loop) when motion is reduced. */
function ListeningBars({ live }: { live: boolean }) {
  const bars = [0.55, 1, 0.4, 0.85, 0.6]
  return (
    <span
      aria-hidden
      className="ml-3 inline-flex items-end gap-1 align-middle"
      style={{ height: 18 }}
    >
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-1 origin-bottom rounded-full bg-forest"
          style={{ height: h * 18 }}
          initial={false}
          animate={live ? { scaleY: [1, 0.35, 1] } : { scaleY: 1 }}
          transition={
            live
              ? { duration: 1.1 + i * 0.13, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0 }
          }
        />
      ))}
    </span>
  )
}

export function Hero({
  onListen,
  onSample,
}: {
  onListen: () => void
  onSample: () => void
}) {
  const reduced = useReducedMotion()
  const state = reduced ? 'show' : 'hidden'

  return (
    <section className="relative overflow-hidden">
      {/* botanical / dawn backdrop: pure CSS, no external imagery */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 90% at 85% -10%, rgb(232 177 63 / 0.20), transparent 58%), radial-gradient(90% 70% at -10% 110%, rgb(46 196 182 / 0.20), transparent 55%)',
        }}
      />
      {/* one slowly drifting glow for life (still when motion is reduced) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -z-10 h-72 w-72 rounded-full blur-3xl"
        style={{
          top: '-4rem',
          right: '12%',
          background:
            'radial-gradient(circle, rgb(87 214 138 / 0.28), transparent 70%)',
        }}
        animate={reduced ? undefined : { x: [0, 24, 0], y: [0, 18, 0] }}
        transition={
          reduced ? undefined : { duration: 16, repeat: Infinity, ease: 'easeInOut' }
        }
      />

      {/* the bird swoops in from the top-right corner on load, then settles
          beside the headline and idles there, banked toward the text */}
      <motion.div
        className="pointer-events-none absolute -z-10 right-2 top-8 sm:right-auto sm:left-[calc(50%+8rem)] sm:top-16"
        initial={
          reduced ? false : { x: '42vw', y: '-46vh', opacity: 0, scale: 0.55, rotate: -26 }
        }
        animate={reduced ? undefined : { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
        transition={
          reduced
            ? undefined
            : { duration: 4.8, delay: 0.4, ease: [0.45, 0.05, 0.55, 0.95] }
        }
      >
        <motion.img
          src="/rio-bird.gif"
          alt=""
          aria-hidden
          className="block w-56 -rotate-[16deg] sm:w-80 lg:w-96"
          initial={false}
          animate={reduced ? undefined : { x: [0, 26, 0], y: [0, -8, 0] }}
          transition={
            reduced
              ? undefined
              : { duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 5.4 }
          }
        />
      </motion.div>

      <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="max-w-2xl">
          <motion.div
            variants={container}
            initial={state}
            animate={reduced ? undefined : 'show'}
          >
            <div className="flex items-center">
              <Kicker>{KICKER}</Kicker>
              <ListeningBars live={!reduced} />
            </div>

            <motion.h1
              variants={container}
              initial={state}
              animate={reduced ? undefined : 'show'}
              className="mt-4 text-gradient"
            >
              {HEADLINE.split(' ').map((w, i) => (
                <motion.span key={i} variants={word} className="inline-block">
                  {w}
                  {i < HEADLINE.split(' ').length - 1 ? '\u00A0' : ''}
                </motion.span>
              ))}
            </motion.h1>
          </motion.div>

          <motion.p
            variants={rise}
            initial={state}
            animate={reduced ? undefined : 'show'}
            transition={{ delay: reduced ? 0 : 0.55 }}
            className="mt-5 text-lg leading-relaxed text-muted"
          >
            {BLURB}
          </motion.p>

          <motion.div
            variants={rise}
            initial={state}
            animate={reduced ? undefined : 'show'}
            transition={{ delay: reduced ? 0 : 0.7 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Button onClick={onListen}>
              <Bird size={18} aria-hidden />
              Listen to a bird
            </Button>
            <Button variant="secondary" onClick={onSample}>
              Explore a sample
            </Button>
          </motion.div>

          <motion.p
            variants={rise}
            initial={state}
            animate={reduced ? undefined : 'show'}
            transition={{ delay: reduced ? 0 : 0.85 }}
            className="mt-6 flex items-center gap-2 text-sm text-muted"
          >
            <Footprints size={16} aria-hidden className="text-moss" />
            The point is the walk, not the app. When the mission starts, the
            screen gets deliberately boring.
          </motion.p>
        </div>
      </div>
    </section>
  )
}
