import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface IconSelectOption<T extends string = string> {
  value: T
  label: string
  icon: LucideIcon
  keywords?: string[]
}

export function IconSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Elegir icono',
}: {
  value: T
  onChange: (value: T) => void
  options: IconSelectOption<T>[]
  placeholder?: string
}) {
  return (
    <div role="radiogroup" aria-label={placeholder} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const Icon = option.icon
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex size-10 items-center justify-center rounded-[var(--radius-control)] border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
              selected
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-zinc-200 bg-surface text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700',
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
