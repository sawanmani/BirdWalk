import { useCallback, useEffect, useState } from 'react'
import { fetchHealth } from '../lib/api.ts'
import type { BackendState } from '../lib/types.ts'

export function useBackendStatus(): {
  state: BackendState
  recheck: () => void
} {
  const [state, setState] = useState<BackendState>('checking')
  const [nonce, setNonce] = useState(0)

  const recheck = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setState('checking')
    fetchHealth()
      .then((h) => {
        if (cancelled) return
        setState(h.model_ready ? 'online_model_ready' : 'online_model_missing')
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
