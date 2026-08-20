import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Search, Shield, Trash2, Users, Wallet } from 'lucide-react'
import type { Member, MemberStatus, Role } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useCreateMember, useMembers, useRemoveMember } from '@/hooks/useMembers'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FullPageSpinner,
  IconButton,
  Input,
  Money,
  Sensitive,
  Text,
  Table,
  Tooltip,
  type Column,
} from '@/components/ui'
import { memberAccessState, ROLE_LABEL, STATUS_LABEL } from '@/utils/roles'
import { formatDate } from '@/utils/format'
import { getPaymentStatus } from '@/utils/payments'
import { adminMemberDetail } from '@/routes/routePaths'
import { MemberFormModal } from './MemberFormModal'
import { MemberRegisterPaymentModal } from './MemberRegisterPaymentModal'
import { env } from '@/config/env'
import { ensureClinicLoginIndexes } from '@/services/memberLoginService'

const STATUS_TONE: Record<MemberStatus, 'green' | 'amber' | 'red'> = {
  active: 'green',
  paused: 'amber',
  overdue: 'red',
}

function canRegisterPayment(member: Member): boolean {
  return member.role === 'user'
}

/**
 * Vencimiento de la cuota con recordatorio sutil de deuda: la fecha en texto
 * normal y, si está atrasado, una línea chica en ámbar (aviso, no error) con
 * cuotas adeudadas y días de atraso.
 */
function DueDateInfo({ member, prefix }: { member: Member; prefix?: string }) {
  const due = member.role === 'user' ? member.paymentDate : undefined
  if (!due) return <span className="text-zinc-400">—</span>
  const status = getPaymentStatus(due)
  return (
    <div>
      <span>
        {prefix ? `${prefix} ` : ''}
        {formatDate(due)}
      </span>
      {status.daysOverdue > 0 && (
        <span className="block text-xs text-amber-600">
          Debe {status.monthsOwed === 1 ? '1 cuota' : `${status.monthsOwed} cuotas`} ·{' '}
          {status.daysOverdue === 1 ? '1 día de atraso' : `${status.daysOverdue} días de atraso`}
        </span>
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  if (role === 'admin') {
    return (
      <Badge tone="violet">
        <Shield className="mr-1 size-3.5" aria-hidden />
        {ROLE_LABEL.admin}
      </Badge>
    )
  }
  return <Badge tone="neutral">{ROLE_LABEL.user}</Badge>
}

export function MembersListPage() {
  const { user } = useAuth()
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const navigate = useNavigate()
  const run = useToastAction()
  const { data: members = [], isLoading } = useMembers(clinicId)
  const createMember = useCreateMember(clinicId)
  const removeMember = useRemoveMember(clinicId)
  const healedClinicId = useRef<string | null>(null)

  useEffect(() => {
    if (env.demoMode || isLoading || members.length === 0) return
    if (healedClinicId.current === clinicId) return
    healedClinicId.current = clinicId
    void ensureClinicLoginIndexes(clinicId, members).catch(() => {
      healedClinicId.current = null
    })
  }, [clinicId, isLoading, members])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [payMember, setPayMember] = useState<Member | null>(null)
  const [toDelete, setToDelete] = useState<Member | null>(null)

  // No permitimos auto-eliminarse: un admin que borra su propia fila se
  // quedaría sin acceso al consultorio en el acto.
  const isSelf = (member: Member) => !!user?.uid && member.uid === user.uid

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => removeMember.mutateAsync(toDelete.id), {
      success: 'Paciente eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDelete(null)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return members
    return members.filter(
      (m) => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    )
  }, [members, search])

  const openPay = (member: Member, e?: { stopPropagation: () => void }) => {
    e?.stopPropagation()
    if (!canRegisterPayment(member)) return
    setPayMember(member)
  }

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Paciente',
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.fullName} src={m.photoURL} size="sm" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="listItem">{m.fullName}</Text>
              <RoleBadge role={m.role} />
            </div>
            <Sensitive className="block text-xs text-zinc-500">{m.email}</Sensitive>
          </div>
        </div>
      ),
    },
    { key: 'service', header: 'Servicio', render: (m) => (m.role === 'admin' ? 'No aplica' : m.service || '—') },
    {
      key: 'cost',
      header: 'Mensual',
      render: (m) => (m.role === 'admin' ? '—' : <Money value={m.monthlyCost} />),
    },
    {
      key: 'due',
      header: 'Vencimiento',
      render: (m) => <DueDateInfo member={m} />,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (m) => <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>,
    },
    {
      key: 'access',
      header: 'Acceso',
      render: (m) => {
        const s = memberAccessState(m)
        return s.needsAttention ? (
          <Tooltip text={s.action ?? ''}>
            <Badge tone={s.tone}>{s.label}</Badge>
          </Tooltip>
        ) : (
          <span className="text-xs text-zinc-400">Activo</span>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-px whitespace-nowrap',
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          {canRegisterPayment(m) && (
            <Tooltip text={`Registrar pago de ${m.fullName}`}>
              <IconButton
                icon={<Wallet className="size-5" />}
                tone="brand"
                className="border border-brand-100"
                onClick={(e) => openPay(m, e)}
                label={`Registrar pago de ${m.fullName}`}
              />
            </Tooltip>
          )}
          {!isSelf(m) && (
            <Tooltip text={`Eliminar a ${m.fullName}`}>
              <IconButton
                icon={<Trash2 className="size-4" />}
                tone="danger"
                className="border border-red-200 text-red-500"
                onClick={(e) => {
                  e.stopPropagation()
                  setToDelete(m)
                }}
                label={`Eliminar a ${m.fullName}`}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
  ]

  const handleCreate = async (data: Omit<Member, 'id' | 'uid'>) => {
    const ok = await run(() => createMember.mutateAsync(data), {
      success: 'Paciente creado. Podrá ingresar con su email.',
      error: 'No se pudo crear el paciente',
    })
    if (ok) setModalOpen(false)
  }

  return (
    <AppLayout
      title="Pacientes"
      subtitle="Gestioná las altas, pagos y rutinas de tus pacientes."
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalOpen(true)}>
          Nuevo paciente
        </Button>
      }
    >
      <div className="relative mb-5 max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : filtered.length === 0 ? (
        search.trim() ? (
          <EmptyState
            icon={Search}
            title="Sin resultados"
            description={`No hay pacientes que coincidan con "${search.trim()}".`}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Sin pacientes"
            description="Creá el primer paciente para empezar a gestionar el consultorio."
          />
        )
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((m) => (
              <Card key={m.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => navigate(adminMemberDetail(m.id))}
                  className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                >
                  <Avatar name={m.fullName} src={m.photoURL} size="md" />
                  <div className="min-w-0 flex-1">
                    <Text variant="listItem" className="truncate">
                      {m.fullName}
                    </Text>
                    <Sensitive className="block truncate text-xs text-zinc-500">{m.email}</Sensitive>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <RoleBadge role={m.role} />
                      <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
                      {m.role === 'user' && m.monthlyCost != null ? (
                        <span className="text-xs text-zinc-500">
                          <Money value={m.monthlyCost} /> /mes
                        </span>
                      ) : null}
                      {memberAccessState(m).needsAttention ? (
                        <Badge tone={memberAccessState(m).tone}>{memberAccessState(m).label}</Badge>
                      ) : null}
                    </div>
                    {m.role === 'user' && m.paymentDate ? (
                      <div className="mt-1.5 text-xs text-zinc-500">
                        <DueDateInfo member={m} prefix="Vence" />
                      </div>
                    ) : null}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-zinc-300" aria-hidden />
                </button>
                {(canRegisterPayment(m) || !isSelf(m)) && (
                  <div className="border-t border-zinc-100 p-3">
                    <div className="flex items-center justify-end gap-1">
                      {canRegisterPayment(m) && (
                        <Tooltip text={`Registrar pago de ${m.fullName}`}>
                          <IconButton
                            icon={<Wallet className="size-5" />}
                            tone="brand"
                            className="border border-brand-100"
                            onClick={() => openPay(m)}
                            label={`Registrar pago de ${m.fullName}`}
                          />
                        </Tooltip>
                      )}
                      {!isSelf(m) && (
                        <Tooltip text={`Eliminar a ${m.fullName}`}>
                          <IconButton
                            icon={<Trash2 className="size-4" />}
                            tone="danger"
                            className="border border-red-200 text-red-500"
                            onClick={() => setToDelete(m)}
                            label={`Eliminar a ${m.fullName}`}
                          />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="hidden md:block">
            <Table
              columns={columns}
              rows={filtered}
              keyOf={(m) => m.id}
              onRowClick={(m) => navigate(adminMemberDetail(m.id))}
            />
          </div>
        </>
      )}

      <MemberFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        saving={createMember.isPending}
      />

      {payMember && (
        <MemberRegisterPaymentModal
          open
          onClose={() => setPayMember(null)}
          clinicId={clinicId}
          member={payMember}
          adminUid={user?.uid ?? ''}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar paciente"
        description={`¿Querés eliminar a ${toDelete?.fullName}? Se borrarán sus datos, pagos y registros. Esta acción no se puede deshacer.`}
        loading={removeMember.isPending}
      />
    </AppLayout>
  )
}
