import type { DateValue } from '@/types'
import { Badge, Money } from '@/components/ui'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { formatDate } from '@/utils/format'
import { amountOwed, getPaymentStatus } from '@/utils/payments'

/**
 * Detalle de pago genérico (paciente o consultorio): cuota, último pago, próximo
 * vencimiento y estado de deuda (al día / debe $X desde {fecha} / bloqueado).
 */
export function PaymentSummary({
  monthlyCost,
  lastPaymentDate,
  dueDate,
  subject = 'patient',
}: {
  monthlyCost?: number
  lastPaymentDate?: DateValue
  dueDate?: DateValue
  subject?: 'patient' | 'clinic'
}) {
  const status = getPaymentStatus(dueDate, lastPaymentDate)
  const owed = amountOwed(monthlyCost, status.monthsOwed)
  // La deuda del consultorio suspende el tenant; la del paciente solo lo bloquea a él.
  const blockedLabel = subject === 'clinic' ? 'Suspendido' : 'Bloqueado'
  const dueLabel = subject === 'clinic' ? 'Próximo pago' : 'Próximo vencimiento'

  return (
    <div className="space-y-3">
      <InfoGrid
        items={[
          { label: 'Cuota', value: <Money value={monthlyCost} /> },
          { label: 'Último pago', value: formatDate(lastPaymentDate) },
          { label: dueLabel, value: formatDate(dueDate) },
        ]}
      />

      {status.state === 'al_dia' ? (
        <Badge tone="green">Al día</Badge>
      ) : (
        <div
          className={status.state === 'blocked' ? 'rounded-lg bg-red-50 p-3' : 'rounded-lg bg-amber-50 p-3'}
        >
          <Badge tone={status.state === 'blocked' ? 'red' : 'amber'}>
            {status.state === 'blocked' ? blockedLabel : 'Vencido'}
          </Badge>
          <p className="mt-1.5 text-sm text-zinc-700">
            Debe{' '}
            <strong>
              <Money value={owed} />
            </strong>{' '}
            desde el {formatDate(status.owesSince)} ({status.daysOverdue} días de atraso).
          </p>
        </div>
      )}
    </div>
  )
}
