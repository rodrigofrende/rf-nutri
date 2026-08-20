import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Receipt, Trash2, TrendingUp, Wallet } from 'lucide-react'
import type { PatientPayment, TariffKind } from '@/types'
import type { NewPatientPayment } from '@/services/paymentsService'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { usePayments, useRecordPayment, useRemovePayment } from '@/hooks/usePayments'
import { useMembers } from '@/hooks/useMembers'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FullPageSpinner,
  IconButton,
  Money,
  Select,
  StatCard,
  Table,
  Text,
  type Column,
} from '@/components/ui'
import { formatDate, toDate } from '@/utils/format'
import { monthKey, MONTHS_LONG } from '@/utils/dates'
import { TARIFF_KIND_LABELS, tariffKindLabel } from '@/utils/tariffs'
import { adminPatientDetail } from '@/routes/routePaths'
import { RecordPaymentModal } from './RecordPaymentModal'

const TARIFF_KIND_VALUES = Object.keys(TARIFF_KIND_LABELS) as TariffKind[]

export function PaymentsHistoryPage() {
  const { user } = useAuth()
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const run = useToastAction()

  const { data: payments = [], isLoading } = usePayments(clinicId)
  const { data: members = [] } = useMembers(clinicId)
  const record = useRecordPayment(clinicId)
  const remove = useRemovePayment(clinicId)

  const [filterMember, setFilterMember] = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [toDelete, setToDelete] = useState<PatientPayment | null>(null)

  // KPIs SIEMPRE del mes actual, sin importar los filtros: son la foto del
  // negocio hoy, no del recorte que se esté mirando.
  const stats = useMemo(() => {
    const currentKey = monthKey(new Date())
    const ofMonth = payments.filter((p) => {
      const d = toDate(p.date)
      return d ? monthKey(d) === currentKey : false
    })
    const total = ofMonth.reduce((sum, p) => sum + p.amount, 0)
    const count = ofMonth.length
    return { total, count, average: count ? Math.round(total / count) : 0 }
  }, [payments])

  const patientOptions = useMemo(
    () =>
      members
        .filter((m) => m.role === 'user')
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
        .map((m) => ({ value: m.id, label: m.fullName })),
    [members],
  )

  const serviceOptions = TARIFF_KIND_VALUES.map((k) => ({
    value: k,
    label: TARIFF_KIND_LABELS[k],
  }))

  // Últimos 12 meses (incluido el actual), del más nuevo al más viejo.
  const monthOptions = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return { value: monthKey(d), label: `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` }
    })
  }, [])

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        if (filterMember && p.memberId !== filterMember) return false
        if (filterService && p.serviceType !== filterService) return false
        if (filterMonth) {
          const d = toDate(p.date)
          if (!d || monthKey(d) !== filterMonth) return false
        }
        return true
      }),
    [payments, filterMember, filterService, filterMonth],
  )

  const hasFilters = !!(filterMember || filterService || filterMonth)

  const handleRecord = async (data: Omit<NewPatientPayment, 'createdBy'>) => {
    const ok = await run(() => record.mutateAsync({ ...data, createdBy: user?.uid ?? '' }), {
      success: 'Cobro registrado',
      error: 'No se pudo registrar el cobro',
    })
    if (ok) setModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => remove.mutateAsync(toDelete.id), {
      success: 'Cobro eliminado',
      error: 'No se pudo eliminar el cobro',
    })
    if (ok) setToDelete(null)
  }

  const columns: Column<PatientPayment>[] = [
    { key: 'date', header: 'Fecha', render: (p) => formatDate(p.date) },
    {
      key: 'member',
      header: 'Paciente',
      render: (p) => (
        <Link
          to={adminPatientDetail(p.memberId)}
          className="font-medium text-zinc-900 hover:text-brand-700 hover:underline"
        >
          {p.memberName}
        </Link>
      ),
    },
    {
      key: 'service',
      header: 'Servicio',
      render: (p) => <Badge tone="neutral">{tariffKindLabel(p.serviceType)}</Badge>,
    },
    {
      key: 'amount',
      header: 'Monto',
      render: (p) => <Money value={p.amount} className="font-medium" />,
    },
    {
      key: 'comment',
      header: 'Comentario',
      className: 'max-w-[16rem]',
      render: (p) =>
        p.comment ? (
          <span className="block truncate" title={p.comment}>
            {p.comment}
          </span>
        ) : (
          <span className="text-zinc-400">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12 text-right',
      render: (p) => (
        <IconButton
          icon={<Trash2 className="size-4" />}
          label={`Eliminar cobro de ${p.memberName}`}
          tone="danger"
          onClick={() => setToDelete(p)}
        />
      ),
    },
  ]

  return (
    <AppLayout
      title="Cobros"
      subtitle="Historial de cobros a pacientes."
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalOpen(true)}>
          Registrar cobro
        </Button>
      }
    >
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Cobrado este mes"
          value={<Money value={stats.total} />}
          tone="green"
        />
        <StatCard icon={Receipt} label="Cobros del mes" value={stats.count} />
        <StatCard
          icon={TrendingUp}
          label="Promedio por cobro"
          value={<Money value={stats.average} />}
          hint="Del mes actual"
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          aria-label="Filtrar por paciente"
          options={patientOptions}
          placeholder="Todos los pacientes"
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
        />
        <Select
          aria-label="Filtrar por tipo de servicio"
          options={serviceOptions}
          placeholder="Todos los servicios"
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
        />
        <Select
          aria-label="Filtrar por mes"
          options={monthOptions}
          placeholder="Todos los meses"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        />
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={hasFilters ? 'Sin resultados' : 'Sin cobros registrados'}
          description={
            hasFilters
              ? 'No hay cobros que coincidan con los filtros elegidos.'
              : 'Cuando registres el cobro de un servicio, va a aparecer acá.'
          }
          action={
            hasFilters ? undefined : (
              <Button
                size="sm"
                leftIcon={<Plus className="size-4" />}
                onClick={() => setModalOpen(true)}
              >
                Registrar cobro
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Tabla en desktop */}
          <div className="hidden md:block">
            <Table columns={columns} rows={filtered} keyOf={(p) => p.id} />
          </div>

          {/* Cards en mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={adminPatientDetail(p.memberId)}
                      className="block truncate text-sm font-medium text-zinc-900 hover:text-brand-700 hover:underline"
                    >
                      {p.memberName}
                    </Link>
                    <Text variant="caption" className="mt-0.5">
                      {formatDate(p.date)}
                    </Text>
                  </div>
                  <IconButton
                    icon={<Trash2 className="size-4" />}
                    label={`Eliminar cobro de ${p.memberName}`}
                    tone="danger"
                    onClick={() => setToDelete(p)}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Badge tone="neutral">{tariffKindLabel(p.serviceType)}</Badge>
                  <Money value={p.amount} className="text-base font-bold text-zinc-900" />
                </div>
                {p.comment && (
                  <Text variant="caption" className="mt-2">
                    {p.comment}
                  </Text>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <RecordPaymentModal
          open
          onClose={() => setModalOpen(false)}
          clinicId={clinicId}
          onSubmit={handleRecord}
          saving={record.isPending}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar cobro"
        description={`¿Querés eliminar este cobro de ${toDelete?.memberName ?? ''}? Esta acción no se puede deshacer.`}
        loading={remove.isPending}
      />
    </AppLayout>
  )
}
