import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'brand' | 'sky' | 'violet'

const TONES: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  brand: 'bg-brand-100 text-brand-700',
  sky: 'bg-sky-100 text-sky-700',
  violet: 'bg-violet-100 text-violet-700',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
      )}
    >
      {children}
    </span>
  )
}
