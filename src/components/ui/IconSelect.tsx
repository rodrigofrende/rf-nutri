import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Search, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Input } from './Input'

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
  searchPlaceholder = 'Buscar icono…',
}: {
  value: T
  onChange: (value: T) => void
  options: IconSelectOption<T>[]
  placeholder?: string
  searchPlaceholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value) ?? options[0]
  const SelectedIcon = selected?.icon

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = options.filter((o) => {
    if (!normalizedQuery) return true
    if (o.label.toLowerCase().includes(normalizedQuery)) return true
    return o.keywords?.some((k) => k.toLowerCase().includes(normalizedQuery))
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const pick = (next: T) => {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-[var(--radius-control)] border border-zinc-200 bg-surface px-3 text-left text-sm transition-colors',
          'hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
          open && 'border-brand-400 ring-2 ring-brand-200',
        )}
      >
        {SelectedIcon ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-brand-50 text-brand-600">
            <SelectedIcon className="size-4" aria-hidden />
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-zinc-400 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-zinc-200 bg-surface shadow-lg"
          role="listbox"
          id={listId}
          aria-label={placeholder}
        >
          <div className="border-b border-zinc-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-zinc-500">Sin resultados</li>
            ) : (
              filtered.map((option) => {
                const Icon = option.icon
                const isSelected = option.value === value
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => pick(option.value)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                        isSelected
                          ? 'bg-brand-50 text-brand-800'
                          : 'text-zinc-700 hover:bg-zinc-50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)]',
                          isSelected ? 'bg-brand-100 text-brand-700' : 'bg-zinc-100 text-zinc-500',
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="font-medium">{option.label}</span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
