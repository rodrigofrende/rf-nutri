import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-zinc-200 bg-surface px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
