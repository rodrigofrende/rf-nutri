import { formatCurrency } from '@/utils/format'

export function Money({ value, className }: { value?: number; className?: string }) {
  return <span className={className}>{formatCurrency(value)}</span>
}
