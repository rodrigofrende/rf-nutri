import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Search, Trash2, Users } from 'lucide-react'
import type { Member, MemberStatus } from '@/types'
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
  Sensitive,
  Text,
  Table,
  Tooltip,
  type Column,
} from '@/components/ui'
import { memberAccessState, STATUS_LABEL } from '@/utils/roles'
import { adminPatientDetail } from '@/routes/routePaths'
import { env } from '@/config/env'
import { ensureClinicLoginIndexes } from '@/services/memberLoginService'
import { PatientFormModal } from './PatientFormModal'
import { GOAL_TYPE_LABELS } from './patientLabels'

const STATUS_TONE: Record<MemberStatus, 'green' | 'amber'> = {
  active: 'green',
  paused: 'amber',
}

function goalLabel(m: Member): string {
  return m.goalType ? GOAL_TYPE_LABELS[m.goalType] : '—'
}

export function PatientsListPage() {
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const navigate = useNavigate()
  const run = useToastAction()
  const { data: members = [], isLoading } = useMembers(clinicId)
  const createMember = useCreateMember(clinicId)
  const removeMember = useRemoveMember(clinicId)
  const healedClinicId = useRef<string | null>(null)

  // Auto-curación del índice de login: pacientes creados antes de que existiera
  // el índice (o con el índice pisado) no podrían entrar nunca. Una vez por clinicId.
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
  const [toDelete, setToDelete] = useState<Member | null>(null)

  // Esta pantalla es SOLO de pacientes: los admins del consultorio se gestionan
  // aparte y acá serían ruido (no tienen ficha clínica ni plan).
  const patients = useMemo(() => members.filter((m) => m.role === 'user'), [members])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return patients
    return patients.filter(
      (m) => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    )
  }, [patients, search])

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => removeMember.mutateAsync(toDelete.id), {
      success: 'Paciente eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDelete(null)
  }

  const handleCreate = async (data: Omit<Member, 'id' | 'uid'>) => {
    const ok = await run(() => createMember.mutateAsync(data), {
      success: 'Paciente creado. Podrá ingresar con su email.',
      error: 'No se pudo crear el paciente',
    })
    if (ok) setModalOpen(false)
  }

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Paciente',
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.fullName} src={m.photoURL} size="sm" />
          <div>
            <Text variant="listItem">{m.fullName}</Text>
            <Sensitive className="block text-xs text-zinc-500">{m.email}</Sensitive>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (m) => (m.phone ? <Sensitive>{m.phone}</Sensitive> : <span className="text-zinc-400">—</span>),
    },
    { key: 'goal', header: 'Objetivo', render: (m) => goalLabel(m) },
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
      key: 'status',
      header: 'Estado',
      render: (m) => <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-px whitespace-nowrap',
      render: (m) => (
        <div className="flex items-center justify-end">
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
        </div>
      ),
    },
  ]

  return (
    <AppLayout
      title="Pacientes"
      subtitle="Gestioná las fichas, planes y seguimiento de tus pacientes."
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
            action={
              <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalOpen(true)}>
                Nuevo paciente
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((m) => {
              const access = memberAccessState(m)
              return (
                <Card key={m.id} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => navigate(adminPatientDetail(m.id))}
                    className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                  >
                    <Avatar name={m.fullName} src={m.photoURL} size="md" />
                    <div className="min-w-0 flex-1">
                      <Text variant="listItem" className="truncate">
                        {m.fullName}
                      </Text>
                      <Sensitive className="block truncate text-xs text-zinc-500">{m.email}</Sensitive>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
                        {access.needsAttention && <Badge tone={access.tone}>{access.label}</Badge>}
                        {m.goalType && (
                          <span className="text-xs text-zinc-500">{GOAL_TYPE_LABELS[m.goalType]}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-zinc-300" aria-hidden />
                  </button>
                  <div className="border-t border-zinc-100 p-3">
                    <div className="flex items-center justify-end">
                      <Tooltip text={`Eliminar a ${m.fullName}`}>
                        <IconButton
                          icon={<Trash2 className="size-4" />}
                          tone="danger"
                          className="border border-red-200 text-red-500"
                          onClick={() => setToDelete(m)}
                          label={`Eliminar a ${m.fullName}`}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="hidden md:block">
            <Table
              columns={columns}
              rows={filtered}
              keyOf={(m) => m.id}
              onRowClick={(m) => navigate(adminPatientDetail(m.id))}
            />
          </div>
        </>
      )}

      <PatientFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        saving={createMember.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar paciente"
        description={`¿Querés eliminar a ${toDelete?.fullName}? Se borrarán su ficha, mediciones, pagos y registros. Esta acción no se puede deshacer.`}
        loading={removeMember.isPending}
      />
    </AppLayout>
  )
}
