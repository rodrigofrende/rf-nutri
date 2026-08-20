import { Trash2 } from 'lucide-react'
import type { DateValue } from '@/types'
import { Money, IconButton } from '@/components/ui'
import { formatDate } from '@/utils/format'

/**
 * Estructural a propósito: acepta tanto `Payment` (cuota SaaS del consultorio)
 * como `PatientPayment` (cobros a pacientes) sin acoplarse a ninguno.
 */
interface PaymentRow {
  id: string
  amount: number
  date: DateValue
  comment?: string
}

export function PaymentHistoryList({
  payments,
  onDelete,
}: {
  payments: PaymentRow[]
  onDelete?: (paymentId: string) => void
}) {
  if (!payments.length) {
    return <p className="text-sm text-zinc-500">Todavía no hay pagos registrados.</p>
  }
  return (
    <ul className="space-y-2">
      {payments.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-3 border-b border-zinc-50 pb-2 text-sm last:border-0"
        >
          <div className="min-w-0">
            <p className="font-medium text-zinc-800">
              <Money value={p.amount} />
            </p>
            {p.comment && <p className="truncate text-xs text-zinc-500">{p.comment}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-zinc-400">{formatDate(p.date)}</span>
            {onDelete && (
              <IconButton
                icon={<Trash2 className="size-4" />}
                label="Eliminar pago"
                tone="danger"
                onClick={() => onDelete(p.id)}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
