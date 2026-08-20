import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
}

export function Table<T>({
  columns,
  rows,
  keyOf,
  onRowClick,
}: {
  columns: Column<T>[]
  rows: T[]
  keyOf: (row: T) => string
  onRowClick?: (row: T) => void
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-zinc-200 bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs uppercase tracking-wide text-zinc-500">
            {columns.map((c) => (
              <th key={c.key} className={cn('px-4 py-3 font-medium', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyOf(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onRowClick(row)
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              className={cn(
                'border-b border-zinc-50 last:border-0',
                onRowClick &&
                  'cursor-pointer hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
              )}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3 text-zinc-700', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
