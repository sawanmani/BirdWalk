import { motion } from 'framer-motion'
import { Bird, HelpCircle } from 'lucide-react'
import { Button, Kicker, StatusBanner } from './ui.tsx'
import type { AnalyzeResponse } from '../lib/types.ts'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'

function scoreBar(score: number): string {
  return `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%`
}

export function ResultCard({
  result,
  onMission,
  onAgain,
}: {
  result: AnalyzeResponse
  onMission: () => void
  onAgain: () => void
}) {
  const reduced = useReducedMotion()
  const noResult = result.status === 'no_reliable_detection' ||
    result.predictions.length === 0

  return (
    <motion.section
      initial={reduced ? undefined : { opacity: 0, y: 12 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6"
      aria-label="What we heard"
    >
      {result.is_demo_fixture && (
        <div className="mb-6">
          <StatusBanner tone="fixture">
            <strong>DEMO FIXTURE.</strong> These results were not produced
            by a real model. Development mode only.
          </StatusBanner>
        </div>
      )}

      <Kicker>What we heard</Kicker>
      <h2 className="mt-3 text-forest">
        {noResult ? 'Nothing we can say with confidence' : 'Possible matches'}
      </h2>

      {noResult ? (
        <div className="card-field mt-6 flex items-start gap-4 px-6 py-8">
          <HelpCircle aria-hidden className="mt-0.5 shrink-0 text-moss" />
          <p className="text-sm leading-relaxed text-muted">
            The model did not find a reliable match in this clip — that
            happens with wind, distance, traffic or overlapping calls,
            and it is a legitimate answer, not a failure. BirdWalk would
            rather say "not sure" than invent a species. You can try
            again with a closer or longer clip, or still take a mission.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {result.predictions.map((p, i) => (
            <li
              key={p.rank}
              className={
                i === 0
                  ? 'card-field border-pine/40 bg-white px-6 py-5'
                  : 'card-field bg-white/60 px-6 py-4'
              }
            >
              <p className="flex items-center gap-3">
                <Bird
                  size={i === 0 ? 22 : 17}
                  aria-hidden
                  className={i === 0 ? 'text-forest' : 'text-moss'}
                />
                <span>
                  <span
                    className={
                      i === 0
                        ? 'block font-display text-xl text-forest'
                        : 'block font-semibold text-ink'
                    }
                  >
                    {p.species_common_name}
                  </span>
                  {p.species_scientific_name && (
                    <span className="block text-xs italic text-muted">
                      {p.species_scientific_name}
                    </span>
                  )}
                </span>
              </p>
              <p className="mt-3 flex items-center gap-3 text-xs text-muted">
                <span
                  aria-hidden
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-sage"
                >
                  <span
                    className="block h-full rounded-full bg-moss"
                    style={{ width: scoreBar(p.model_score) }}
                  />
                </span>
                <span className="tabular-nums">
                  model score {p.model_score.toFixed(2)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-xs leading-relaxed text-muted">
        Model scores are the raw output of the classifier — not accuracy,
        not probability, and not a verified sighting. Overlapping calls,
        distance, wind and microphone quality all affect results. Treat
        every name above as a possible match worth checking, never a
        certainty. Powered by {result.model.model_name}{' '}
        <span className="whitespace-nowrap">({result.model.model_version})</span>.
      </p>

      {result.source_label && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          This clip’s source labels it as <em>{result.source_label}</em> —
          the uploader’s own claim, not verified ground truth. The model
          never saw this label; any agreement is a pipeline smoke test,
          not a field test.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <Button onClick={onMission}>
          {noResult ? 'Give me a mission anyway' : 'Give me a nature mission'}
        </Button>
        <Button variant="secondary" onClick={onAgain}>
          Listen again
        </Button>
      </div>
    </motion.section>
  )
}
