import { useEffect, useRef, useState } from 'react'
import {
  Mic,
  Square,
  X,
  Upload,
  ChevronRight,
  Bird,
} from 'lucide-react'
import { Button, StatusBanner } from './ui.tsx'
import { useRecorder } from '../hooks/useRecorder.ts'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'
import { backendRunsOnThisMachine } from '../lib/api.ts'
import type { SampleEntry } from '../lib/types.ts'
import { cn } from '../lib/cn.ts'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // matches the backend limit

// Where the analysis happens decides what we may promise about the audio path.
const LOCAL = backendRunsOnThisMachine()

export interface Submission {
  blob: Blob
  filename: string
  source: 'recording' | 'upload' | 'sample'
  sourceLabel?: string | null
}

export function RecordingPanel({
  mode,
  samples,
  onSubmit,
  onBack,
  modelDisabled,
}: {
  mode: 'record' | 'sample'
  samples: SampleEntry[]
  onSubmit: (s: Submission) => void
  onBack: () => void
  modelDisabled: boolean
}) {
  const recorder = useRecorder()
  const reduced = useReducedMotion()
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Waveform visualisation (decorative; skipped for reduced motion)
  useEffect(() => {
    if (recorder.state !== 'recording' || reduced) return
    // Read the live brand colour from the CSS token so the bars always match
    // the theme (was a hardcoded light-theme green that went invisible on the
    // dark background).
    const barColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-forest')
        .trim() || '#57d68a'
    const draw = () => {
      const analyser = recorder.analyserRef.current
      const canvas = canvasRef.current
      if (analyser && canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const data = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(data)
          const { width, height } = canvas
          ctx.clearRect(0, 0, width, height)
          ctx.fillStyle = barColor
          const bars = 48
          const step = Math.floor(data.length / bars)
          for (let i = 0; i < bars; i += 1) {
            const v = data[i * step] / 255
            const bh = Math.max(2, v * height * 0.9)
            ctx.fillRect(
              i * (width / bars) + 1,
              (height - bh) / 2,
              width / bars - 3,
              bh,
            )
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [recorder.state, recorder.analyserRef, reduced])

  useEffect(() => {
    if (recorder.state === 'ready' && recorder.result) {
      onSubmit({
        blob: recorder.result.blob,
        filename: 'recording.webm',
        source: 'recording',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.state])

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That file is larger than 25 MB. Trim it to a few seconds of audio.')
      return
    }
    onSubmit({ blob: file, filename: file.name, source: 'upload' })
  }

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6" aria-label="Listen">
      <button
        onClick={() => {
          recorder.cancel()
          onBack()
        }}
        className="mb-6 flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <X size={15} aria-hidden /> Back
      </button>

      {modelDisabled && (
        <div className="mb-6">
          <StatusBanner tone="warn">
            {LOCAL
              ? 'The local model is not ready yet, so analysis will honestly report that instead of guessing. Recording and upload still work.'
              : 'The demo model is not ready yet — the server fetches its weights on each cold start — so analysis will honestly report that instead of guessing. Recording and upload still work.'}
          </StatusBanner>
        </div>
      )}
      {error && (
        <div className="mb-6">
          <StatusBanner tone="error" dismissible onDismiss={() => setError('')}>
            {error}
          </StatusBanner>
        </div>
      )}

      {mode === 'record' ? (
        <div className="card-field flex flex-col items-center gap-6 px-6 py-10 text-center">
          <div>
            <h2 className="text-forest">Capture a few seconds</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Hold near the sound for 3–10 seconds. Keep a respectful
              distance from wildlife — no calling, baiting or playback.
            </p>
          </div>

          {recorder.state === 'idle' || recorder.state === 'error' ? (
            <>
              <p className="text-sm text-muted">
                {LOCAL
                  ? 'Your microphone is used only for this recording. Audio is sent to the local service on your own machine for analysis and is not stored.'
                  : 'Your microphone is used only for this recording. Audio is sent to the demo server for analysis, held in a temporary file and not stored.'}
              </p>
              <Button onClick={() => void recorder.start()} disabled={modelDisabled}>
                <Mic size={18} aria-hidden /> Start recording
              </Button>
            </>
          ) : null}

          {recorder.state === 'requesting' ? (
            <p className="text-sm text-muted" aria-live="polite">
              Waiting for microphone permission…
            </p>
          ) : null}

          {recorder.state === 'denied' ? (
            <StatusBanner tone="error">
              Microphone permission was denied. You can upload a file or
              try a sample instead — nothing else changes.
            </StatusBanner>
          ) : null}

          {recorder.state === 'unsupported' ? (
            <StatusBanner tone="error">
              This browser cannot record audio. Try upload or a sample.
            </StatusBanner>
          ) : null}

          {(recorder.state === 'recording' || recorder.state === 'stopping') && (
            <div className="flex flex-col items-center gap-5">
              <div
                className={cn(
                  'grid size-28 place-items-center rounded-full border-4 transition-colors',
                  recorder.state === 'recording'
                    ? 'border-danger bg-danger/10'
                    : 'border-moss bg-sage/50',
                )}
                role="timer"
                aria-live="off"
              >
                <span className="font-display text-3xl text-ink">
                  {recorder.elapsed.toFixed(1)}s
                </span>
              </div>
              {!reduced && (
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={44}
                  aria-hidden
                  className="w-[280px]"
                />
              )}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={recorder.cancel}>
                  <X size={16} aria-hidden /> Cancel
                </Button>
                <Button onClick={recorder.stop} disabled={recorder.elapsed < 1}>
                  <Square size={16} aria-hidden /> Stop &amp; analyse
                </Button>
              </div>
              <p className="text-xs text-muted">
                Auto-stops at {recorder.maxSeconds}s to keep the clip —
                and the screen time — short.
              </p>
            </div>
          )}

          <div className="mt-2 w-full border-t border-moss/20 pt-5">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.webm"
              className="sr-only"
              aria-label="Upload an audio file"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              className="w-full"
            >
              <Upload size={16} aria-hidden /> …or upload an audio file
            </Button>
          </div>
        </div>
      ) : (
        <div className="card-field px-6 py-8">
          <h2 className="text-forest">Try a recorded sample</h2>
          <p className="mt-2 text-sm text-muted">
            Licensed clips {LOCAL ? 'fetched by the sample script' : 'served by the demo server'}. These
            verify the pipeline — they are smoke tests, not field tests.
          </p>
          {samples.length === 0 ? (
            <p className="mt-6 rounded-xl bg-sage/60 p-4 text-sm text-muted">
              {LOCAL ? (
                <>
                  No samples on disk yet. Run{' '}
                  <code className="font-mono text-ink">
                    python scripts/download_samples.py
                  </code>{' '}
                  (network required once), then refresh.
                </>
              ) : (
                'The demo server has no sample clips available right now. Record or upload a file instead.'
              )}
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {samples.map((s) => (
                <li key={s.id}>
                  <button
                    disabled={modelDisabled}
                    onClick={() =>
                      onSubmit({
                        blob: new Blob([]),
                        filename: s.file,
                        source: 'sample',
                        sourceLabel: s.species_label,
                      })
                    }
                    className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-moss/25 bg-panel/70 px-5 py-4 text-left transition-colors hover:border-pine/60 hover:bg-sage/60 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-3">
                      <Bird size={18} aria-hidden className="text-moss" />
                      <span>
                        <span className="block font-semibold text-ink">
                          {s.species_label}
                        </span>
                        <span className="block text-xs text-muted">
                          {s.creator} · {s.license}
                        </span>
                      </span>
                    </span>
                    <ChevronRight
                      size={18}
                      aria-hidden
                      className="text-moss transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                const inp = document.createElement('input')
                inp.type = 'file'
                inp.accept = 'audio/*'
                inp.onchange = () =>
                  handleFile(inp.files?.[0])
                inp.click()
              }}
            >
              <Upload size={16} aria-hidden /> Upload your own file instead
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

