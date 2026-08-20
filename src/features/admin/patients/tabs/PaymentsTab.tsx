import { useMemo, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import type { Member } from '@/types'
import type { NewPatientPayment } from '@/services/paymentsService'
import { useMemberPayments, useRecordPayment, useRemovePayment } from '@/hooks/usePayments'
import { useToastAction } from '@/hooks/useToastAction'
import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, EmptyState, Money, Spinner } from '@/components/ui'
import { PaymentHistoryList } from '@/features/payments/PaymentHistoryList'
import { RecordPaymentModal } from '@/features/admin/payments/RecordPaymentModal'
import { tariffKindLabel } from '@/utils/tariffs'
import { toDate } from '@/utils/format'

export function PaymentsTab({
  clinicId,
  member,
  adminUid,
}: {
  clinicId: string
  member: Member
  adminUid: string
}) {
  const run = useToastAction()
  const { data: payments = [], isLoading } = useMemberPayments(clinicId, member.id)
  const record = useRecordPayment(clinicId)
  const removePayment = useRemovePayment(clinicId)
  const [open, setOpen] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)

  const yearTotal = useMemo(() => {
    const year = new Date().getFullYear()
    return payments.reduce((acc, p) => {
      const date = toDate(p.date)
      return date && date.getFullYear() === year ? acc + p.amount : acc
    }, 0)
  }, [payments])

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => removePayment.mutateAsync(toDelete), {
      success: 'Cobro eliminado',
      error: 'No se pudo eliminar el cobro',
    })
    if (ok) setToDelete(null)
  }

  const handleSubmit = async (data: Omit<NewPatientPayment, 'createdBy'>) => {
    const ok = await run(() => record.mutateAsync({ ...data, createdBy: adminUid }), {
      success: 'Cobro registrado',
      error: 'No se pudo registrar el cobro',
    })
    if (ok) setOpen(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Cobros"
          subtitle="Consultas, tratamientos y servicios facturados a este paciente."
          action={
            <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
              Registrar cobro
            </Button>
          }
        />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="green">
              Total {new Date().getFullYear()}: <Money value={yearTotal} />
            </Badge>
            <span className="text-xs text-zinc-500">{payments.length} registro{payments.length === 1 ? '' : 's'}</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Historial" />
        <CardBody>
          {isLoading ? (
            <Spinner />
          ) : payments.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Sin cobros"
              description="Registrá el primer cobro de una consulta o tratamiento."
            />
          ) : (
            <PaymentHistoryList
              payments={payments.map((p) => ({
                id: p.id,
                amount: p.amount,
                date: p.date,
                comment: [tariffKindLabel(p.serviceType), p.comment].filter(Boolean).join(' · '),
              }))}
              onDelete={(id) => setToDelete(id)}
            />
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar cobro"
        description="¿Querés eliminar este cobro del historial? Esta acción no se puede deshacer."
        loading={removePayment.isPending}
      />

      {open && (
        <RecordPaymentModal
          open
          onClose={() => setOpen(false)}
          clinicId={clinicId}
          defaultMemberId={member.id}
          onSubmit={(data) => void handleSubmit(data)}
          saving={record.isPending}
        />
      )}
    </div>
  )
}
