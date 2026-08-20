import { formatCurrency } from '@/utils/format'
import { Sensitive } from './Sensitive'

/** Monto formateado ($ con `.` de miles) que se blurea en modo discreto. */
export function Money({ value, className }: { value?: number; className?: string }) {
  return <Sensitive className={className}>{formatCurrency(value)}</Sensitive>
}
