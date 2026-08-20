import { useId } from 'react'
import { cn } from '@/utils/cn'
import { InfoTooltip } from './InfoTooltip'

export function Toggle({
  checked,
  onChange,
  label,
  description,
  tooltip,
  disabled = false,
  id,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  tooltip?: string
  disabled?: boolean
  id?: string
  className?: string
}) {
  const autoId = useId()
  const toggleId = id ?? autoId

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      {(label || description) && (
        <div className="min-w-0 flex-1">
          {label ? (
            <label htmlFor={toggleId} className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700">
              <span>{label}</span>
              {tooltip ? <InfoTooltip text={tooltip} /> : null}
            </label>
          ) : null}
          {description ? <p className="mt-0.5 text-xs text-zinc-500">{description}</p> : null}
        </div>
      )}
      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-[var(--radius-pill)] transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          checked ? 'bg-brand-600' : 'bg-zinc-200',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-[var(--radius-pill)] bg-white shadow-sm transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}
