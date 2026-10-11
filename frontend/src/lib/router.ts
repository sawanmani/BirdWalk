import { useCallback, useEffect, useState } from 'react'

// Dependency-free hash router.
//
// Why not react-router: the project is deliberately local-first with no extra
// framework/runtime, and an offline `npm install` would fail here. A hash
// router gives real, deep-linkable URLs per page + working browser
// Back/Forward — which is the whole point of splitting the menus into
// separate pages — with ~zero footprint. Routes live in `window.location.hash`
// so the static build works from any path (including file://).

export type Route = '/' | '/collection' | '/leaderboard' | '/journal' | '/about'

const ROUTES: readonly Route[] = ['/', '/collection', '/leaderboard', '/journal', '/about']

function readHash(): Route {
  const raw = window.location.hash.replace(/^#/, '')
  return (ROUTES as readonly string[]).includes(raw) ? (raw as Route) : '/'
}

export function useRouter(): { route: Route; navigate: (to: Route) => void } {
  const [route, setRoute] = useState<Route>(readHash)

  useEffect(() => {
    const onChange = () => setRoute(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((to: Route) => {
    // Setting the hash fires `hashchange`, which updates `route`. Guard the
    // no-op so re-clicking the active tab doesn't pile up history entries.
    if (readHash() === to) return
    window.location.hash = to
  }, [])

  return { route, navigate }
}
