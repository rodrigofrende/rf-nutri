import { useMemo } from 'react'
import { Receipt, Wallet } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useMyPayments } from '@/hooks/usePayments'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, EmptyState, FullPageSpinner, Money, StatCard } from '@/components/ui'
import { formatDate, toDate } from '@/utils/format'
import { tariffKindLabel } from '@/utils/tariffs'

export function MyPaymentsPage() {
  const { user } = useAuth()
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const uid = user?.uid ?? ''

  const { data: payments = [], isLoading } = useMyPayments(clinicId, uid)

  // Total del año en curso: el resumen que el paciente quiere ver de un vistazo.
  const currentYear = new Date().getFullYear()
  const yearTotal = useMemo(
    () =>
      payments.reduce((acc, p) => {
        const date = toDate(p.date)
        return date && date.getFullYear() === currentYear ? acc + p.amount : acc
      }, 0),
    [payments, currentYear],
  )

  if (isLoading) {
    return (
      <AppLayout title="Mis pagos">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Mis pagos" subtitle="Lo que abonaste en tu consultorio.">
      <div className="mx-auto max-w-2xl space-y-4">
        {payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Todavía no hay pagos registrados"
            description="Cuando tu consultorio registre un pago tuyo, va a aparecer acá."
          />
        ) : (
          <>
            <StatCard
              icon={Wallet}
              label={`Total ${currentYear}`}
              value={<Money value={yearTotal} />}
              tone="green"
            />
            <Card>
              <div className="divide-y divide-zinc-100">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Receipt className="size-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900">{tariffKindLabel(p.serviceType)}</p>
                      <p className="text-xs text-zinc-500">{formatDate(p.date)}</p>
                      {p.comment && <p className="mt-0.5 text-xs text-zinc-500">{p.comment}</p>}
                    </div>
                    <Money value={p.amount} className="shrink-0 text-sm font-semibold text-zinc-900" />
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  )
}
