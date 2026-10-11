import { Leaf } from 'lucide-react'
import type { BackendState } from '../lib/types'
import { cn } from '../lib/cn.ts'

const STATE_LABEL: Record<BackendState, string> = {
  checking: 'Checking local service…',
  online_model_ready: 'Local model ready',
  online_assets_missing: 'Service up — model weights not downloaded',
  online_package_missing: 'Service up — BirdNET not installed',
  offline: 'Local service unreachable',
  error: 'Local service error',
}

export function Header({
  backendState,
  onHistory,
  onCollection,
  onAbout,
  historyDisabled,
}: {
  backendState: BackendState
  onHistory: () => void
  onCollection: () => void
  onAbout: () => void
  historyDisabled: boolean
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-moss/20 bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="flex items-center gap-2 font-display text-xl font-semibold text-forest">
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-forest text-paper">
            <Leaf size={18} />
          </span>
          BirdWalk
        </p>

        <div className="flex items-center gap-1 sm:gap-2">
          <p
            aria-live="polite"
            className="mr-2 hidden items-center gap-2 text-xs text-muted sm:flex"
          >
            <span
              aria-hidden
              className={cn(
                'size-2 rounded-full',
                backendState === 'online_model_ready' && 'bg-pine',
                (backendState === 'online_assets_missing' ||
                  backendState === 'online_package_missing') &&
                  'bg-sunlit',
                (backendState === 'offline' || backendState === 'error') &&
                  'bg-danger',
                backendState === 'checking' && 'bg-moss animate-pulse',
              )}
            />
            {STATE_LABEL[backendState]}
          </p>
          <button
            onClick={onCollection}
            disabled={historyDisabled}
            className="rounded-full px-3 py-2 text-sm font-medium text-pine hover:bg-sage/70 disabled:opacity-40"
          >
            Collection
          </button>
          <button
            onClick={onHistory}
            disabled={historyDisabled}
            className="rounded-full px-3 py-2 text-sm font-medium text-pine hover:bg-sage/70 disabled:opacity-40"
          >
            Journal
          </button>
          <button
            onClick={onAbout}
            className="rounded-full px-3 py-2 text-sm font-medium text-pine hover:bg-sage/70"
          >
            About
          </button>
        </div>
      </div>
      <p className="px-4 pb-2 text-xs text-muted sm:hidden" aria-live="polite">
        {STATE_LABEL[backendState]}
      </p>
    </header>
  )
}
