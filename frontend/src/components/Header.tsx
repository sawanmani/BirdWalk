import { Leaf } from 'lucide-react'
import { backendRunsOnThisMachine } from '../lib/api.ts'
import type { BackendState } from '../lib/types'
import { cn } from '../lib/cn.ts'
import type { Route } from '../lib/router.ts'
import {
  AboutIcon,
  CollectionIcon,
  JournalIcon,
  LeaderboardIcon,
} from './NavIcons.tsx'

// "Local" is only true of a development run on the visitor's own machine; the
// deployed site talks to a hosted backend, so its labels drop the word.
const HOSTED_LABEL: Record<BackendState, string> = {
  checking: 'Checking service…',
  online_model_ready: 'Model ready',
  online_assets_missing: 'Service up — model weights not downloaded',
  online_package_missing: 'Service up — BirdNET not installed',
  offline: 'Service unreachable',
  error: 'Service error',
}

const STATE_LABEL: Record<BackendState, string> = backendRunsOnThisMachine()
  ? {
      ...HOSTED_LABEL,
      checking: 'Checking local service…',
      online_model_ready: 'Local model ready',
      offline: 'Local service unreachable',
      error: 'Local service error',
    }
  : HOSTED_LABEL

type Tab = {
  route: Route
  label: string
  Icon: typeof CollectionIcon
  active: string
}

const TABS: Tab[] = [
  { route: '/collection', label: 'Collection', Icon: CollectionIcon, active: 'bg-teal text-paper shadow-sm' },
  { route: '/leaderboard', label: 'Leaderboard', Icon: LeaderboardIcon, active: 'bg-glow text-paper shadow-sm' },
  { route: '/journal', label: 'Journal', Icon: JournalIcon, active: 'bg-coral text-paper shadow-sm' },
  { route: '/about', label: 'About', Icon: AboutIcon, active: 'bg-sky text-paper shadow-sm' },
]

export function Header({
  backendState,
  route,
  onNavigate,
  navDisabled,
}: {
  backendState: BackendState
  route: Route
  onNavigate: (to: Route) => void
  navDisabled: boolean
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-moss/20 bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 font-display text-xl font-semibold"
        >
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-forest text-paper">
            <Leaf size={18} />
          </span>
          <span className="text-gradient">BirdWalk</span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          <p
            aria-live="polite"
            className="mr-2 hidden items-center gap-2 text-xs text-muted lg:flex"
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

          <nav className="flex items-center gap-1" aria-label="Primary">
            {TABS.map(({ route: r, label, Icon, active }) => {
              const isActive = route === r
              return (
                <button
                  key={r}
                  onClick={() => onNavigate(r)}
                  disabled={navDisabled}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40',
                    isActive
                      ? active
                      : 'text-pine hover:bg-sage/70',
                  )}
                >
                  <Icon width={16} height={16} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>
      <p className="px-4 pb-2 text-xs text-muted lg:hidden" aria-live="polite">
        {STATE_LABEL[backendState]}
      </p>
    </header>
  )
}
