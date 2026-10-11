import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'

// Honest, non-deceptive progress labels only (BUILD_PROMPTS.md §2.3):
// no fake percentages. Actual backend latency decides when we move on.
export function AnalysingPanel({ stage }: { stage: 0 | 1 | 2 }) {
  const reduced = useReducedMotion()
  const stages = ['Preparing audio', 'Running local model', 'Preparing your mission']

  return (
    <motion.section
      initial={reduced ? undefined : { opacity: 0 }}
      animate={reduced ? undefined : { opacity: 1 }}
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6"
      role="status"
      aria-live="polite"
      aria-label="Analysing"
    >
      <Loader2 aria-hidden className="animate-spin text-forest" size={36} />
      <ol className="flex flex-col gap-2">
        {stages.map((label, i) => (
          <li
            key={label}
            className={
              i < stage
                ? 'text-sm text-muted line-through decoration-moss/60'
                : i === stage
                  ? 'font-display text-lg text-forest'
                  : 'text-sm text-muted/50'
            }
          >
            {label}
          </li>
        ))}
      </ol>
      <p className="max-w-xs text-xs text-muted">
        Inference runs on your own machine. First run may take longer if
        the model is still warming up.
      </p>
    </motion.section>
  )
}
