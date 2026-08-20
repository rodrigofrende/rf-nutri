import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: string
  tone?: 'brand' | 'green' | 'amber' | 'red'
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className={`flex size-12 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="text-2xl font-bold text-zinc-900">{value}</p>
          {hint && <p className="text-xs text-zinc-400">{hint}</p>}
        </div>
      </div>
    </Card>
  )
}
