import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Clinic, ClinicSubscription } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import {
  useRegisterSubscriptionPayment,
  useRemoveSubscriptionPayment,
  useSubscriptionPayments,
} from '@/hooks/usePayments'
import { useToastAction } from '@/hooks/useToastAction'
import { Button, ConfirmDialog, DateInput, FormField, Input, Modal, MoneyInput, Spinner, Text } from '@/components/ui'
import { parseDateInput, todayDateInput } from '@/utils/dates'
import { PaymentSummary } from '@/features/payments/PaymentSummary'
import { PaymentHistoryList } from '@/features/payments/PaymentHistoryList'

/** Detalle de suscripción + registrar pago + historial de un clinic (super-admin). */
export function ClinicPaymentsModal({ clinic, onClose }: { clinic: Clinic; onClose: () => void }) {
  const { user } = useAuth()
  const run = useToastAction()
  const { data: payments = [], isLoading } = useSubscriptionPayments(clinic.id)
  const register = useRegisterSubscriptionPayment(clinic.id)
  const removePayment = useRemoveSubscriptionPayment(clinic.id)
  const sub = clinic.subscription

  const [amount, setAmount] = useState(sub?.monthlyCost ?? 0)
  const [date, setDate] = useState(() => todayDateInput())
  const [comment, setComment] = useState('')
  const [toDelete, setToDelete] = useState<string | null>(null)

  const resetForm = () => {
    setAmount(sub?.monthlyCost ?? 0)
    setDate(todayDateInput())
    setComment('')
  }

  const handleRegister = async () => {
    if (amount <= 0) return
    const subscription: ClinicSubscription = sub ?? { monthlyCost: amount, status: 'active' }
    const ok = await run(
      () =>
        register.mutateAsync({
          payment: {
            amount,
            date: parseDateInput(date),
            comment: comment.trim() || undefined,
            createdBy: user?.uid ?? '',
          },
          subscription,
        }),
      { success: 'Pago registrado', error: 'No se pudo registrar el pago' },
    )
    if (ok) resetForm()
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => removePayment.mutateAsync(toDelete), {
      success: 'Pago eliminado',
      error: 'No se pudo eliminar el pago',
    })
    if (ok) setToDelete(null)
  }

  return (
    <Modal
      open
      onClose={() => {
        resetForm()
        onClose()
      }}
      title={`Suscripción — ${clinic.name}`}
      size="lg"
    >
      <div className="space-y-6">
        <PaymentSummary
          subject="clinic"
          monthlyCost={sub?.monthlyCost}
          lastPaymentDate={sub?.lastPaymentDate}
          dueDate={sub?.dueDate}
        />

        <div className="space-y-3 rounded-[var(--radius-control)] border border-zinc-200 p-4">
          <Text variant="label">Registrar pago</Text>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Monto">
              <MoneyInput value={amount} onChange={setAmount} />
            </FormField>
            <FormField label="Fecha">
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label="Comentario">
              <Input
                placeholder="Ej. Transferencia"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button
              leftIcon={<Plus className="size-4" />}
              loading={register.isPending}
              disabled={amount <= 0}
              onClick={handleRegister}
            >
              Registrar pago
            </Button>
          </div>
        </div>

        <div>
          <Text variant="label" className="mb-2">
            Historial
          </Text>
          {isLoading ? (
            <Spinner />
          ) : (
            <PaymentHistoryList payments={payments} onDelete={(id) => setToDelete(id)} />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar pago"
        description="¿Querés eliminar este pago del historial? Esta acción no se puede deshacer."
        loading={removePayment.isPending}
      />
    </Modal>
  )
}
