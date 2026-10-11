import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'stopping'
  | 'ready'
  | 'denied'
  | 'unsupported'
  | 'error'

export interface RecorderResult {
  blob: Blob
  durationSeconds: number
  mimeType: string
}

const MAX_SECONDS = 15

// Browser microphone recording with capability checks, permission
// handling, duration limits, cancel, and a live analyser for the
// waveform. Nothing leaves the page until the user submits it.
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<RecorderResult | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
    analyserRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      setState('stopping')
      mr.stop()
    }
  }, [])

  const start = useCallback(async () => {
    setResult(null)
    setElapsed(0)

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('unsupported')
      return
    }

    setState('requesting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false },
      })
    } catch (err) {
      setState(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'denied'
          : 'error',
      )
      return
    }
    streamRef.current = stream

    let mimeType = ''
    for (const candidate of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', '']) {
      if (candidate === '' || MediaRecorder.isTypeSupported(candidate)) {
        mimeType = candidate
        break
      }
    }

    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = mr
    chunksRef.current = []

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mr.mimeType || 'audio/webm',
      })
      const seconds = (Date.now() - startedAtRef.current) / 1000
      cleanup()
      if (blob.size === 0) {
        setState('error')
        return
      }
      setResult({ blob, durationSeconds: seconds, mimeType: mr.mimeType })
      setState('ready')
    }

    // Live analyser for the waveform visual
    try {
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioContextRef.current = ctx
      analyserRef.current = analyser
    } catch {
      /* waveform is decorative; recording continues without it */
    }

    startedAtRef.current = Date.now()
    mr.start()
    setState('recording')
    timerRef.current = window.setInterval(() => {
      const secs = (Date.now() - startedAtRef.current) / 1000
      setElapsed(Math.min(secs, MAX_SECONDS))
      if (secs >= MAX_SECONDS) stop()
    }, 100)
  }, [cleanup, stop])

  const cancel = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      mr.onstop = null
      mr.stop()
    }
    cleanup()
    setState('idle')
    setElapsed(0)
    setResult(null)
  }, [cleanup])

  const reset = useCallback(() => {
    setResult(null)
    setElapsed(0)
    setState('idle')
  }, [])

  return {
    state,
    elapsed,
    result,
    maxSeconds: MAX_SECONDS,
    analyserRef,
    start,
    stop,
    cancel,
    reset,
  }
}
