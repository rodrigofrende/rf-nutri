import { useEffect, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, KeyRound, Mail, Pencil, Phone, RefreshCw, Trash2 } from 'lucide-react'
import type { Member } from '@/types'
import { DEFAULT_CLINIC_SETTINGS } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import {
  useMember,
  useMembers,
  useReissueMemberAccess,
  useRemoveMember,
  useUpdateMember,
} from '@/hooks/useMembers'
import { useClinic } from '@/hooks/useClinic'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  FullPageSpinner,
  IconButton,
  Input,
  Modal,
} from '@/components/ui'
import { toDate } from '@/utils/format'
import { suggestLoginEmail, tenantEmailDomain } from '@/utils/loginEmail'
import { memberAccessState, STATUS_LABEL } from '@/utils/roles'
import { ageAt } from '@/utils/anthropometry'
import { ROUTES } from '@/routes/routePaths'
import { cn } from '@/utils/cn'
import { env } from '@/config/env'
import { syncMemberLoginIndex } from '@/services/memberLoginService'
import { syncMemberUidOnAssignedRecords } from '@/services/memberOwnership'
import { PatientFormModal } from './PatientFormModal'
import { FichaTab } from './tabs/FichaTab'
import { AnthropometryTab } from './tabs/AnthropometryTab'
import { MealPlanTab } from './tabs/MealPlanTab'
import { DiaryTab } from './tabs/DiaryTab'
import { CheckInsTab } from './tabs/CheckInsTab'
import { AppointmentsTab } from './tabs/AppointmentsTab'
import { PaymentsTab } from './tabs/PaymentsTab'
import { NotesTab } from './tabs/NotesTab'
import { PageHelp } from '@/components/shared/PageHelp'
import {
  ANTHROPOMETRY_HELP,
  FICHA_APPOINTMENTS_HELP,
  FICHA_CHECKIN_HELP,
  FICHA_DIARY_HELP,
  FICHA_PAYMENTS_HELP,
  FICHA_PLAN_HELP,
  type PageHelpItem,
} from '@/content/help'

type Tab =
  | 'ficha'
  | 'anthropometry'
  | 'plan'
  | 'diary'
  | 'checkins'
  | 'appointments'
  | 'payments'
  | 'notes'

// Un member "admin" es un colega nutricionista, no un paciente: no tiene ficha
// de tratamiento ni seguimiento. Las tabs userOnly se ocultan para ellos.
const TABS: { key: Tab; label: string; userOnly?: boolean }[] = [
  { key: 'ficha', label: 'Ficha' },
  { key: 'anthropometry', label: 'Antropometría', userOnly: true },
  { key: 'plan', label: 'Plan', userOnly: true },
  { key: 'diary', label: 'Diario', userOnly: true },
  { key: 'checkins', label: 'Check-ins', userOnly: true },
  { key: 'appointments', label: 'Turnos', userOnly: true },
  { key: 'payments', label: 'Pagos', userOnly: true },
  { key: 'notes', label: 'Notas' },
]

const TAB_HELP: Partial<Record<Tab, { items: PageHelpItem[]; title: string }>> = {
  anthropometry: { items: ANTHROPOMETRY_HELP, title: 'Cómo funciona la antropometría' },
  plan: { items: FICHA_PLAN_HELP, title: 'Cómo funciona el plan' },
  diary: { items: FICHA_DIARY_HELP, title: 'Cómo funciona el diario' },
  checkins: { items: FICHA_CHECKIN_HELP, title: 'Cómo funcionan los check-ins' },
  appointments: { items: FICHA_APPOINTMENTS_HELP, title: 'Cómo funcionan los turnos' },
  payments: { items: FICHA_PAYMENTS_HELP, title: 'Cómo funcionan los cobros' },
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function PatientDetailPage() {
  const { memberId = '' } = useParams()
  const { user, sendPasswordReset } = useAuth()
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const navigate = useNavigate()
  const run = useToastAction()
  const { notify } = useToast()

  const { data: member, isLoading } = useMember(clinicId, memberId)
  const { data: members = [] } = useMembers(clinicId)
  const { data: clinic } = useClinic(clinicId)
  const updateMember = useUpdateMember(clinicId)
  const removeMember = useRemoveMember(clinicId)
  const reissue = useReissueMemberAccess(clinicId)
  const [tab, setTab] = useState<Tab>('ficha')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [reissueEmail, setReissueEmail] = useState('')
  const [reissuing, setReissuing] = useState(false)

  // Auto-curación del índice de login del paciente que todavía no reclamó su
  // acceso: si el índice se perdió, no podría crear su contraseña nunca.
  useEffect(() => {
    if (env.demoMode || !member) return
    if (member.authStatus !== 'pending_password' && member.authStatus !== 'password_change_required') return
    void syncMemberLoginIndex(clinicId, member.id, member).catch(() => undefined)
  }, [clinicId, member])

  useEffect(() => {
    if (env.demoMode || !member?.uid) return
    void syncMemberUidOnAssignedRecords(clinicId, member.id, member.uid).catch(() => undefined)
  }, [clinicId, member?.id, member?.uid])

  if (isLoading) {
    return (
      <AppLayout title="Paciente">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  if (!member) {
    return (
      <AppLayout title="Paciente">
        <p className="text-sm text-zinc-500">No se encontró el paciente.</p>
      </AppLayout>
    )
  }

  const settings = clinic?.settings ?? DEFAULT_CLINIC_SETTINGS
  const isAdminMember = member.role === 'admin'
  const visibleTabs = TABS.filter((t) => !t.userOnly || !isAdminMember)
  const tabHelp = TAB_HELP[tab]
  const birth = toDate(member.birthDate)
  const age = birth ? ageAt(birth) : null

  const handleEdit = async (data: Omit<Member, 'id' | 'uid'>) => {
    const ok = await run(() => updateMember.mutateAsync({ memberId, data }), {
      success: 'Paciente actualizado',
      error: 'No se pudo actualizar',
    })
    if (ok) setEditOpen(false)
  }

  const confirmDelete = async () => {
    const ok = await run(() => removeMember.mutateAsync(memberId), {
      success: 'Paciente eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) navigate(ROUTES.ADMIN_PATIENTS)
  }

  const requirePasswordChange = async () => {
    const ok = await run(
      () =>
        updateMember.mutateAsync({
          memberId,
          data: {
            authStatus:
              member.authStatus === 'pending_password' ? 'pending_password' : 'password_change_required',
            passwordResetRequestedAt: Timestamp.now(),
          },
        }),
      {
        success:
          member.authStatus === 'pending_password'
            ? 'El paciente seguirá creando su contraseña en el primer ingreso'
            : 'Se requerirá cambio de contraseña en el próximo login',
        error: 'No se pudo actualizar la seguridad del paciente',
      },
    )
    if (ok) setPasswordOpen(false)
  }

  const accessEmail = member.loginEmail || member.email
  const access = memberAccessState(member)
  const existingEmails = members.filter((m) => m.id !== memberId).map((m) => m.loginEmail || m.email)
  // ¿El acceso es un alias interno del consultorio (@nombre-del-consultorio.com)
  // o un email real? El alias no es un buzón real → el reset por email nunca le llega.
  const esAlias =
    !!clinic?.name && accessEmail.toLowerCase().endsWith(`@${tenantEmailDomain(clinic.name)}`)

  const handleSendReset = async () => {
    setSendingReset(true)
    const ok = await run(() => sendPasswordReset(accessEmail), {
      success: `Si la cuenta existe, le llegó un email a ${accessEmail} (decile que revise spam). Su contraseña actual sigue funcionando hasta que use el link.`,
      error: 'No pudimos enviar el email de restablecimiento.',
    })
    setSendingReset(false)
    if (ok) setPasswordOpen(false)
  }

  const suggestInternal = () =>
    setReissueEmail(suggestLoginEmail(member.fullName, clinic?.name ?? '', existingEmails))

  const handleReissue = async () => {
    const email = reissueEmail.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return notify('Ingresá un email válido', 'error')
    if (email === accessEmail.toLowerCase())
      return notify('El acceso nuevo tiene que ser distinto del actual', 'error')
    if (existingEmails.some((e) => e.toLowerCase() === email))
      return notify('Ya hay otro paciente con ese email de acceso', 'error')
    setReissuing(true)
    const ok = await run(() => reissue.mutateAsync({ memberId, newLoginEmail: email }), {
      success: `Listo. El paciente entra con ${email} y crea su contraseña en el primer ingreso.`,
      error: 'No se pudo re-emitir el acceso',
    })
    setReissuing(false)
    if (ok) {
      setReissueEmail('')
      setPasswordOpen(false)
    }
  }

  return (
    <AppLayout title={member.fullName}>
      <button
        onClick={() => navigate(ROUTES.ADMIN_PATIENTS)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="size-4" /> Volver a pacientes
      </button>

      <Card className="mb-5">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={member.fullName} src={member.photoURL} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm text-zinc-500">{member.email}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                {member.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden />
                    {member.phone}
                  </span>
                )}
                {age != null && <span>{age} años</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={member.status === 'active' ? 'green' : 'amber'}>
                  {STATUS_LABEL[member.status]}
                </Badge>
                <Badge tone={access.tone}>{access.label}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leftIcon={<KeyRound className="size-4" />}
              onClick={() => setPasswordOpen(true)}
            >
              Restablecer acceso
            </Button>
            <IconButton
              icon={<Pencil className="size-4" />}
              label="Editar paciente"
              className="border border-zinc-200 text-zinc-500"
              onClick={() => setEditOpen(true)}
            />
            <IconButton
              icon={<Trash2 className="size-4" />}
              label="Eliminar paciente"
              tone="danger"
              className="border border-red-200 text-red-500"
              onClick={() => setDeleteOpen(true)}
            />
          </div>
        </div>

        <div className="flex items-stretch border-t border-zinc-100">
          <div className="relative min-w-0 flex-1">
            <div className="no-scrollbar flex gap-1 overflow-x-auto px-3">
              {visibleTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                    tab === t.key
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-zinc-500 hover:text-zinc-700',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent sm:hidden"
              aria-hidden
            />
          </div>
          {tabHelp && (
            <div className="flex shrink-0 items-center border-l border-zinc-100 px-1.5">
              <PageHelp compact items={tabHelp.items} title={tabHelp.title} />
            </div>
          )}
        </div>
      </Card>

      {access.needsAttention && (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <KeyRound className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">{access.label}</p>
            <p className="mt-0.5 text-amber-800">{access.action}</p>
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              className="mt-2 font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
            >
              Gestionar acceso
            </button>
          </div>
        </div>
      )}

      {tab === 'ficha' && <FichaTab member={member} onEdit={() => setEditOpen(true)} />}

      {tab === 'anthropometry' && !isAdminMember && (
        <AnthropometryTab clinicId={clinicId} member={member} settings={settings} adminUid={user?.uid ?? ''} />
      )}

      {tab === 'plan' && !isAdminMember && (
        <MealPlanTab clinicId={clinicId} member={member} settings={settings} />
      )}

      {tab === 'diary' && !isAdminMember && <DiaryTab clinicId={clinicId} memberId={memberId} />}

      {tab === 'checkins' && !isAdminMember && <CheckInsTab clinicId={clinicId} memberId={memberId} />}

      {tab === 'appointments' && !isAdminMember && (
        <AppointmentsTab clinicId={clinicId} member={member} adminUid={user?.uid ?? ''} />
      )}

      {tab === 'payments' && !isAdminMember && (
        <PaymentsTab clinicId={clinicId} member={member} adminUid={user?.uid ?? ''} />
      )}

      {tab === 'notes' && <NotesTab clinicId={clinicId} memberId={memberId} adminUid={user?.uid ?? ''} />}

      <PatientFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        initial={member}
        saving={updateMember.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar paciente"
        description={`¿Querés eliminar a ${member.fullName}? Se borrarán su ficha, mediciones, pagos y registros. Esta acción no se puede deshacer.`}
        loading={removeMember.isPending}
      />

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Acceso del paciente">
        <div className="space-y-4">
          {/* Estado actual del acceso */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">{accessEmail}</p>
              <p className="text-xs text-zinc-500">
                {access.label} · {esAlias ? 'alias interno del consultorio' : 'email real'}
              </p>
            </div>
            <Badge tone={access.tone}>{access.needsAttention ? 'Requiere acción' : 'OK'}</Badge>
          </div>

          {/* Reset por email: blanqueo MISMO email, repetible. Solo sirve con email real. */}
          {member.uid && !esAlias && (
            <div className="space-y-2 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
              <p className="text-sm font-medium text-brand-900">Se olvidó la contraseña</p>
              <p className="text-xs text-brand-800">
                Le mandamos a <span className="font-medium">{accessEmail}</span> un link para crear una
                nueva. Lo podés hacer las veces que necesite, sin cambiarle el email.
              </p>
              <Button
                fullWidth
                leftIcon={<Mail className="size-4" />}
                loading={sendingReset}
                onClick={handleSendReset}
              >
                Enviar email de restablecimiento
              </Button>
              <p className="text-[11px] text-brand-700">
                Que revise spam. Su contraseña actual sigue andando hasta que use el link.
              </p>
            </div>
          )}

          {/* Re-emitir acceso: migrar alias→real (primario si es alias) o cambiar el email. */}
          <div
            className={cn(
              'space-y-2 rounded-xl border p-3',
              esAlias ? 'border-brand-100 bg-brand-50/60' : 'border-zinc-200 bg-zinc-50',
            )}
          >
            <p className={cn('text-sm font-medium', esAlias ? 'text-brand-900' : 'text-zinc-800')}>
              {esAlias ? 'Pasarlo a su email real' : 'Cambiar su email de acceso'}
            </p>
            <p className={cn('text-xs', esAlias ? 'text-brand-800' : 'text-zinc-500')}>
              {esAlias
                ? 'Su alias interno no recibe emails, así que no puede recuperar la clave solo. Cargá su email real: vuelve a primer ingreso, crea su contraseña y de ahí en más la recupera por email.'
                : 'Le asignás otro email (o un usuario del consultorio) y vuelve a primer ingreso. Conserva todos sus datos.'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="paciente@gmail.com"
                value={reissueEmail}
                onChange={(e) => setReissueEmail(e.target.value)}
              />
              <Button type="button" variant="secondary" className="shrink-0" onClick={suggestInternal}>
                Usuario del consultorio
              </Button>
            </div>
            <Button
              fullWidth
              variant={esAlias ? undefined : 'secondary'}
              leftIcon={<RefreshCw className="size-4" />}
              loading={reissuing}
              disabled={!reissueEmail.trim()}
              onClick={handleReissue}
            >
              {esAlias ? 'Migrar a email real' : 'Re-emitir acceso'}
            </Button>
          </div>

          {/* Forzar cambio: cuando el paciente SÍ recuerda su contraseña */}
          {member.uid && (
            <div className="border-t border-zinc-100 pt-4">
              <p className="text-sm font-medium text-zinc-700">Todavía recuerda su contraseña</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Forzá el cambio en su próximo ingreso, sin tocar el email.
              </p>
              <Button
                variant="ghost"
                fullWidth
                className="mt-2"
                loading={updateMember.isPending}
                onClick={requirePasswordChange}
              >
                Requerir cambio en el próximo ingreso
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  )
}
