import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from './components/Header.tsx'
import { Hero } from './components/Hero.tsx'
import { Footer } from './components/Footer.tsx'
import { RecordingPanel, type Submission } from './components/RecordingPanel.tsx'
import { AnalysingPanel } from './components/AnalysingPanel.tsx'
import { ResultCard } from './components/ResultCard.tsx'
import {
  MissionPanel,
  PhoneAwayMode,
  MissionComplete,
} from './components/MissionPanel.tsx'
import { HistoryPanel } from './components/HistoryPanel.tsx'
import { AboutPanel } from './components/AboutPanel.tsx'
import { StatusBanner } from './components/ui.tsx'
import {
  analyzeAudio,
  analyzeSampleFile,
  ApiError,
  fetchMission,
  fetchSamples,
} from './lib/api.ts'
import { DEMO_FIXTURE_MODE, fixtureResponse } from './lib/fixture.ts'
import { blobToWav } from './lib/wav.ts'
import {
  markMissionCompleted,
  newId,
  saveSession,
  type SessionRecord,
} from './lib/history.ts'
import { useBackendStatus } from './hooks/useBackendStatus.ts'
import type { AnalyzeResponse, Mission, MissionResponse, SampleEntry } from './lib/types.ts'

type Step =
  | 'start'
  | 'listen_record'
  | 'listen_sample'
  | 'analysing'
  | 'results'
  | 'mission'
  | 'phone_away'
  | 'mission_done'
  | 'journal'
  | 'about'

export default function App() {
  const { state: backendState, recheck } = useBackendStatus()
  const [step, setStep] = useState<Step>('start')
  const [prevStep, setPrevStep] = useState<Step>('start')
  const [samples, setSamples] = useState<SampleEntry[]>([])
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [missionData, setMissionData] = useState<MissionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  const sessionRef = useRef<SessionRecord | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetchSamples()
      .then((r) => setSamples(r.samples))
      .catch(() => setSamples([]))
  }, [backendState])

  const go = (next: Step) => {
    setPrevStep(step)
    setStep(next)
  }

  const handleSubmit = useCallback(async (sub: Submission) => {
    setError(null)
    setStep('analysing')
    setStage(0)
    const t = window.setTimeout(() => setStage(1), 900)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      if (DEMO_FIXTURE_MODE && (sub.source === 'upload' || sub.source === 'recording')) {
        // Explicitly-flagged dev fixture path; never mistaken for inference.
        await new Promise((r) => setTimeout(r, 700))
        setResult(fixtureResponse())
        setStep('results')
        return
      }
      let res: AnalyzeResponse
      if (sub.source === 'sample') {
        res = await analyzeSampleFile(sub.filename, controller.signal)
      } else {
        let blob = sub.blob
        let filename = sub.filename
        if (sub.source === 'recording') {
          // Browsers emit webm/opus (or mp4/aac) which libsndfile cannot
          // decode; normalise to mono 48 kHz WAV locally before upload.
          blob = await blobToWav(sub.blob)
          filename = 'recording.wav'
        }
        res = await analyzeAudio(blob, filename, sub.sourceLabel ?? undefined, controller.signal)
      }
      setResult(res)
      sessionRef.current = {
        id: newId(),
        createdAt: new Date().toISOString(),
        source: sub.source,
        sourceLabel: res.source_label ?? sub.sourceLabel ?? null,
        topPrediction: res.predictions[0]
          ? {
              species_common_name: res.predictions[0].species_common_name,
              model_score: res.predictions[0].model_score,
            }
          : null,
        uncertain: res.status === 'no_reliable_detection',
        mission: null,
        missionCompleted: false,
        isDemoFixture: res.is_demo_fixture,
      }
      saveSession(sessionRef.current)
      setStep('results')
    } catch (err) {
      if (controller.signal.aborted) {
        setStep(sub.source === 'sample' ? 'listen_sample' : 'listen_record')
        return
      }
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the local service. Check that the backend is running, then try again.',
      )
      setStep('start')
    } finally {
      window.clearTimeout(t)
    }
  }, [])

  const requestMission = useCallback(async () => {
    if (!result) return
    setStep('analysing')
    setStage(2)
    try {
      const top = result.predictions[0]
      const mission = await fetchMission({
        top_species: top?.species_common_name ?? null,
        model_score: top?.model_score ?? null,
        uncertain: result.status === 'no_reliable_detection',
      })
      setMissionData(mission)
      if (sessionRef.current) {
        sessionRef.current = {
          ...sessionRef.current,
          mission: {
            id: mission.mission.id,
            title: mission.mission.title,
            category: mission.mission.category,
          },
        }
        saveSession(sessionRef.current)
      }
      setStep('mission')
    } catch {
      // Mission must never dead-end the app (Phase 6 gate).
      setError('The mission service hiccuped. No mission this time — your result is still saved.')
      setStep('results')
    }
  }, [result])

  const completeMission = useCallback(() => {
    if (sessionRef.current) {
      markMissionCompleted(sessionRef.current.id)
    }
    setStep('mission_done')
  }, [])

  const mission: Mission | null = missionData?.mission ?? null

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        backendState={backendState}
        historyDisabled={step === 'mission' || step === 'phone_away'}
        onHistory={() => go('journal')}
        onAbout={() => go('about')}
      />

      <main className="flex-1">
        {(backendState === 'online_assets_missing' ||
          backendState === 'online_package_missing' ||
          backendState === 'offline') &&
          step !== 'phone_away' && (
            <div className="mx-auto mt-4 w-full max-w-xl px-4 sm:px-6">
              <StatusBanner tone="warn" dismissible onDismiss={recheck}>
                {backendState === 'offline'
                  ? 'The local backend is unreachable. Start it with uvicorn (see README), then dismiss to recheck.'
                  : backendState === 'online_package_missing'
                    ? 'The backend is running but the BirdNET-Analyzer package is not installed there. Run pip install -r backend/requirements.txt, then dismiss to recheck.'
                    : 'Backend is up and the BirdNET package is installed, but the model weights/labels are not on disk yet. Analysis will honestly report "model not ready" until they are.'}
              </StatusBanner>
            </div>
          )}

        {DEMO_FIXTURE_MODE && (
          <div className="mx-auto mt-4 w-full max-w-xl px-4 sm:px-6">
            <StatusBanner tone="fixture">
              DEMO FIXTURE MODE is on (dev only). Results are fake and
              labelled as such — never real inference.
            </StatusBanner>
          </div>
        )}

        {error && step === 'start' && (
          <div className="mx-auto mt-4 w-full max-w-xl px-4 sm:px-6">
            <StatusBanner tone="error" dismissible onDismiss={() => setError(null)}>
              {error}
            </StatusBanner>
          </div>
        )}

        {step === 'start' && (
          <Hero
            onListen={() => {
              setError(null)
              go('listen_record')
            }}
            onSample={() => {
              setError(null)
              go('listen_sample')
            }}
          />
        )}

        {(step === 'listen_record' || step === 'listen_sample') && (
          <RecordingPanel
            mode={step === 'listen_record' ? 'record' : 'sample'}
            samples={samples}
            modelDisabled={backendState === 'offline'}
            onSubmit={(s) => void handleSubmit(s)}
            onBack={() => setStep('start')}
          />
        )}

        {step === 'analysing' && (
          <AnalysingPanel stage={stage === 2 ? 2 : stage} />
        )}

        {step === 'results' && result && (
          <>
            {error && (
              <div className="mx-auto mt-4 w-full max-w-xl px-4 sm:px-6">
                <StatusBanner tone="error" dismissible onDismiss={() => setError(null)}>
                  {error}
                </StatusBanner>
              </div>
            )}
            <ResultCard
              result={result}
              onMission={() => void requestMission()}
              onAgain={() => go('listen_record')}
            />
          </>
        )}

        {step === 'mission' && mission && (
          <MissionPanel
            mission={mission}
            generatedBy={missionData?.generated_by ?? 'deterministic_template'}
            onStart={() => go('phone_away')}
            onBackHome={() => setStep('start')}
          />
        )}

        {step === 'phone_away' && mission && (
          <PhoneAwayMode
            mission={mission}
            onComplete={completeMission}
            onSkip={() => setStep('mission')}
          />
        )}

        {step === 'mission_done' && mission && (
          <>
            <MissionComplete mission={mission} />
            <div className="mx-auto w-full max-w-xl px-4 pb-10 sm:px-6">
              <div className="card-field flex flex-col items-center gap-4 px-8 py-12 text-center">
                <h2 className="font-display text-2xl text-forest">
                  Nice. The screen lost, the world won.
                </h2>
                <p className="max-w-sm text-sm text-muted">
                  That's the whole loop: three seconds of listening, one
                  honest clue, two minutes of paying attention to
                  something else.
                </p>
                <button
                  onClick={() => {
                    setResult(null)
                    setMissionData(null)
                    setStep('start')
                  }}
                  className="rounded-full border-2 border-forest/25 px-6 py-3 text-sm font-semibold text-forest hover:bg-sage/60"
                >
                  Back to the start
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'journal' && (
          <HistoryPanel onClose={() => setStep(prevStep === 'journal' ? 'start' : prevStep)} onChanged={() => undefined} />
        )}

        {step === 'about' && (
          <AboutPanel samples={samples} onClose={() => setStep(prevStep === 'about' ? 'start' : prevStep)} />
        )}

        {step === 'start' && error === null && result !== null && (
          <div className="mx-auto w-full max-w-xl px-4 pb-8 text-center sm:px-6">
            <p className="text-sm text-muted">
              <button
                onClick={() => setStep('results')}
                className="text-pine underline underline-offset-4"
              >
                Show my last result again
              </button>
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
