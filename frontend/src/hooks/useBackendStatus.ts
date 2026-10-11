import { useCallback, useEffect, useState } from 'react'
import { fetchHealth } from '../lib/api.ts'
import type { BackendState } from '../lib/types.ts'

export function useBackendStatus(): {
  state: BackendState
  recheck: () => void
} {
  const [state, setState] = useState<BackendState>('checking')
  const [nonce, setNonce] = useState(0)

  // The transition back to 'checking' belongs to the event that starts a new
  // probe, not to the effect body: setting it in the effect would cascade an
  // extra render every time the probe re-ran. The initial state already covers
  // the mount case.
  const recheck = useCallback(() => {
    setState('checking')
    setNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchHealth()
      .then((h) => {
        if (cancelled) return
        if (h.model_ready) {
          setState('online_model_ready')
        } else if (h.package_available) {
          // Analyzer installed but weights/labels not on disk yet.
          setState('online_assets_missing')
        } else {
          // Backend up but the BirdNET-Analyzer package itself is missing.
          setState('online_package_missing')
        }
      })
      .catch(() => {
        if (!cancelled) setState('offline')
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  return { state, recheck }
}
