import type { SVGProps } from 'react'

// Hand-authored tab icons (inline SVG, stroke = currentColor so each tab can
// take its own bright accent). Kept intentionally simple + consistent 24 grid
// so they visually match across sizes.

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** Collection — a life-list / stacked field notes. */
export function CollectionIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 16.5Z" />
      <path d="M4 16.5A2.5 2.5 0 0 1 6.5 14H19" />
      <path d="M9 8.5c1.6 0 2.6 1 3.4 2 .8 1 1.6 2 3.1 2" />
      <circle cx="12.5" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Leaderboard — a bright trophy. */
export function LeaderboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 4h8v4a4 4 0 0 1-8 0Z" />
      <path d="M8 5H6a2 2 0 0 0 0 4h1.5M16 5h2a2 2 0 0 1 0 4h-1.5" />
      <path d="M12 12v3M9 20h6M10 20l.5-3h3l.5 3" />
    </svg>
  )
}

/** Journal — an open notebook with a bookmark. */
export function JournalIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" />
      <path d="M17 7h2v13H8" />
      <path d="M8 8h6M8 11h6" />
      <path d="M14 4v4" />
    </svg>
  )
}

/** About — an info medallion. */
export function AboutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
