import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, WifiOff } from 'lucide-react'
import { cn } from '../lib/cn.ts'

// ---------------------------------------------------------------------------
// Shared primitives: buttons, banners, states. Every interactive control
// here is real — no decorative buttons (SKILLS.md Skill 2).
// ---------------------------------------------------------------------------

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        variant === 'primary' && 'bg-forest text-paper hover:bg-pine',
        variant === 'secondary' &&
          'border-2 border-forest/25 bg-transparent text-forest hover:border-forest/60 hover:bg-sage/60',
        variant === 'ghost' &&
          'bg-transparent text-pine hover:bg-sage/70 underline-offset-4',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function StatusBanner({
  tone,
  children,
  dismissible = false,
  onDismiss,
}: {
  tone: 'info' | 'warn' | 'error' | 'fixture'
  children: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
        tone === 'info' && 'border-moss/40 bg-sage/70 text-ink',
        tone === 'warn' && 'border-sunlit/70 bg-sunlit/20 text-ink',
        tone === 'error' && 'border-danger/40 bg-danger/10 text-ink',
        tone === 'fixture' && 'border-dashed border-danger bg-danger/10 text-ink',
      )}
    >
      <span aria-hidden className="mt-0.5 shrink-0">
        {tone === 'error' || tone === 'fixture' ? (
          <AlertTriangle size={16} className="text-danger" />
        ) : tone === 'warn' ? (
          <WifiOff size={16} className="text-pine" />
        ) : null}
      </span>
      <div className="flex-1">{children}</div>
      {dismissible && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="min-h-0 rounded px-2 py-1 text-xs font-semibold text-muted hover:text-ink"
        >
          Dismiss
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="card-field flex flex-col items-center gap-3 px-8 py-12 text-center">
      <span aria-hidden className="text-moss">
        {icon}
      </span>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action}
    </div>
  )
}

export function ErrorState({
  title,
  detail,
  onRetry,
}: {
  title: string
  detail: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="card-field flex flex-col items-center gap-3 border-danger/40 px-8 py-10 text-center"
    >
      <h3 className="font-display text-xl text-danger">{title}</h3>
      <p className="max-w-md text-sm text-muted">{detail}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="kicker">{children}</p>
}
