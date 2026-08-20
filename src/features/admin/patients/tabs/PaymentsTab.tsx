import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Member } from '@/types'
import { useMemberPayments, useRemoveMemberPayment } from '@/hooks/usePayments'
import { useToastAction } from '@/hooks/useToastAction'
import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, Spinner } from '@/components/ui'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { STATUS_LABEL } from '@/utils/roles'
import { PaymentSummary } from '@/features/payments/PaymentSummary'
import { PaymentHistoryList } from '@/features/payments/PaymentHistoryList'
import { MemberRegisterPaymentModal } from '../MemberRegisterPaymentModal'

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
  const removePayment = useRemoveMemberPayment(clinicId, member.id)
  const [open, setOpen] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)

  if (member.role === 'admin') {
    return (
      <Card>
        <CardHeader title="Pagos" />
        <CardBody>
          <p className="text-sm text-zinc-500">
            Los administradores no tienen cuota mensual ni registro de pagos dentro del consultorio.
          </p>
        </CardBody>
      </Card>
    )
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
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Pagos"
          subtitle="Cuota, vencimiento y deuda"
          action={
            <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
              Registrar pago
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <PaymentSummary
            monthlyCost={member.monthlyCost}
            lastPaymentDate={member.lastPaymentDate}
            dueDate={member.paymentDate}
          />
          <InfoGrid
            items={[
              { label: 'Servicio', value: member.service || '—' },
              { label: 'Estado', value: <Badge tone="neutral">{STATUS_LABEL[member.status]}</Badge> },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Historial de pagos" />
        <CardBody>
          {isLoading ? (
            <Spinner />
          ) : (
            <PaymentHistoryList payments={payments} onDelete={(id) => setToDelete(id)} />
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar pago"
        description="¿Querés eliminar este pago del historial? Esta acción no se puede deshacer."
        loading={removePayment.isPending}
      />

      {open && (
        <MemberRegisterPaymentModal
          open
          onClose={() => setOpen(false)}
          clinicId={clinicId}
          member={member}
          adminUid={adminUid}
        />
      )}
    </div>
  )
}
