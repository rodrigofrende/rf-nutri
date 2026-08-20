import { useEffect, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, KeyRound, Mail, Pencil, RefreshCw, Trash2, Wallet } from 'lucide-react'
import type { Member } from '@/types'
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
  CardBody,
  CardHeader,
  ConfirmDialog,
  FullPageSpinner,
  IconButton,
  Input,
  Modal,
  Sensitive,
} from '@/components/ui'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { formatDate } from '@/utils/format'
import { suggestLoginEmail, tenantEmailDomain } from '@/utils/loginEmail'
import { frequencyLabel } from '@/utils/tariffs'
import { memberAccessState, ROLE_LABEL } from '@/utils/roles'
import { ROUTES } from '@/routes/routePaths'
import { cn } from '@/utils/cn'
import { env } from '@/config/env'
import { syncMemberLoginIndex } from '@/services/memberLoginService'
import { MemberFormModal } from './MemberFormModal'
import { MemberRegisterPaymentModal } from './MemberRegisterPaymentModal'
import { NotesTab } from './tabs/NotesTab'
import { AssignmentsTab } from './tabs/AssignmentsTab'
import { PaymentsTab } from './tabs/PaymentsTab'
import { ProgressTab } from './tabs/ProgressTab'

type Tab = 'data' | 'notes' | 'payments' | 'routines' | 'progress'
// Un paciente "admin" es un profe/administrador, no un paciente: no tiene pagos ni
// entrenamiento. Las tabs userOnly se ocultan para ellos (si quieren entrenar,
// se crean un usuario aparte de tipo "paciente").
const TABS: { key: Tab; label: string; userOnly?: boolean }[] = [
  { key: 'data', label: 'Datos' },
  { key: 'notes', label: 'Notas' },
  { key: 'payments', label: 'Pagos', userOnly: true },
  { key: 'routines', label: 'Rutinas y cargas', userOnly: true },
  { key: 'progress', label: 'Progreso', userOnly: true },
]

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function MemberDetailPage() {
  const { uid: memberId = '' } = useParams()
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
  const [tab, setTab] = useState<Tab>('data')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [reissueEmail, setReissueEmail] = useState('')
  const [reissuing, setReissuing] = useState(false)

  useEffect(() => {
    if (env.demoMode || !member) return
    if (member.authStatus !== 'pending_password' && member.authStatus !== 'password_change_required') return
    void syncMemberLoginIndex(clinicId, member.id, member).catch(() => undefined)
  }, [clinicId, member])

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

  const isAdminMember = member.role === 'admin'
  const visibleTabs = TABS.filter((t) => !t.userOnly || !isAdminMember)

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
    if (ok) navigate(ROUTES.ADMIN_MEMBERS)
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
  // ¿El acceso es un alias interno del clinic (@nombre-del-clinic.com) o un email real?
  // El alias no es un buzón real → el reset por email nunca le llega.
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
        onClick={() => navigate(ROUTES.ADMIN_MEMBERS)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="size-4" /> Volver a pacientes
      </button>

      <Card className="mb-5">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={member.fullName} src={member.photoURL} size="lg" />
            <div>
              <Sensitive className="block text-sm text-zinc-500">{member.email}</Sensitive>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="brand">{ROLE_LABEL[member.role]}</Badge>
                <Badge tone={access.tone}>{access.label}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isAdminMember && (
              <Button leftIcon={<Wallet className="size-4" />} onClick={() => setPayOpen(true)}>
                Registrar pago
              </Button>
            )}
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

        <div className="relative border-t border-zinc-100">
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
          {/* Fade a la derecha: indica que hay más tabs scrolleables en mobile. */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-br-[var(--radius-card)] bg-gradient-to-l from-surface to-transparent sm:hidden"
            aria-hidden
          />
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

      {tab === 'data' && (
        <Card>
          <CardHeader title="Datos personales" />
          <CardBody>
            <InfoGrid
              items={[
                { label: 'Nombre', value: member.fullName },
                { label: 'Email', value: <Sensitive>{member.email}</Sensitive> },
                // Solo cuando difiere del email de contacto: repetido no aporta.
                ...(member.loginEmail &&
                member.loginEmail.trim().toLowerCase() !== member.email.trim().toLowerCase()
                  ? [{ label: 'Email de acceso', value: <Sensitive>{member.loginEmail}</Sensitive> }]
                  : []),
                {
                  label: 'Contraseña',
                  value:
                    member.authStatus === 'pending_password'
                      ? 'Pendiente de crear'
                      : member.authStatus === 'password_change_required'
                        ? 'Cambio requerido'
                        : 'Activa',
                },
                { label: 'Teléfono', value: <Sensitive>{member.phone || '—'}</Sensitive> },
                { label: 'Nacimiento', value: formatDate(member.birthDate) },
                ...(!isAdminMember
                  ? [
                      {
                        label: 'Servicio',
                        value: member.service
                          ? [
                              member.service,
                              member.weeklyFrequency != null
                                ? frequencyLabel(member.weeklyFrequency)
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : '—',
                      },
                      { label: 'Alta', value: formatDate(member.startDate) },
                    ]
                  : []),
              ]}
            />
          </CardBody>
        </Card>
      )}

      {tab === 'notes' && <NotesTab clinicId={clinicId} memberId={memberId} adminUid={user?.uid ?? ''} />}

      {tab === 'payments' && !isAdminMember && (
        <PaymentsTab clinicId={clinicId} member={member} adminUid={user?.uid ?? ''} />
      )}

      {tab === 'routines' && <AssignmentsTab clinicId={clinicId} memberId={memberId} />}

      {tab === 'progress' && <ProgressTab clinicId={clinicId} memberId={memberId} />}

      <MemberFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        initial={member}
        saving={updateMember.isPending}
      />

      {payOpen && !isAdminMember && (
        <MemberRegisterPaymentModal
          open
          onClose={() => setPayOpen(false)}
          clinicId={clinicId}
          member={member}
          adminUid={user?.uid ?? ''}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar paciente"
        description={`¿Querés eliminar a ${member.fullName}? Se borrarán sus datos, pagos y registros. Esta acción no se puede deshacer.`}
        loading={removeMember.isPending}
      />
      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Acceso del paciente">
        <div className="space-y-4">
          {/* Estado actual del acceso */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">{accessEmail}</p>
              <p className="text-xs text-zinc-500">
                {access.label} · {esAlias ? 'alias interno del clinic' : 'email real'}
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
                : 'Le asignás otro email (o un usuario del clinic) y vuelve a primer ingreso. Conserva todos sus datos.'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="paciente@gmail.com"
                value={reissueEmail}
                onChange={(e) => setReissueEmail(e.target.value)}
              />
              <Button type="button" variant="secondary" className="shrink-0" onClick={suggestInternal}>
                Usuario del clinic
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
