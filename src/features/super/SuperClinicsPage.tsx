import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Building2, LogIn, Pencil, Plus, ShieldCheck, Trash2, Upload, UserPlus, Wallet } from 'lucide-react'
import type { Clinic, ClinicSubscription, Member, SubscriptionPlan } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { useTenant } from '@/providers/TenantProvider'
import { fileToLogoDataUrl, LogoImageError } from '@/utils/image'
import { useClinicAdminActions, useClinics } from '@/hooks/useClinics'
import { useCreateMember, useMembers, useRemoveMember } from '@/hooks/useMembers'
import { useToastAction } from '@/hooks/useToastAction'
import { usePlans } from '@/hooks/usePlans'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useFoods } from '@/hooks/useFoods'
import { AppLayout } from '@/components/layout/AppLayout'
import { defaultHomeForRole } from '@/routes/routePaths'
import { addMonths, getPaymentStatus } from '@/utils/payments'
import { formatCurrency, toDate, toDateInput } from '@/utils/format'
import { dateInputToTimestamp, localDayKey, parseDateInput } from '@/utils/dates'
import { exceedsLimit, usageLabel, type ClinicUsage } from '@/utils/plans'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DateInput,
  EmptyState,
  FormField,
  FullPageSpinner,
  Heading,
  IconButton,
  InfoTooltip,
  Input,
  LogoImage,
  Modal,
  MoneyInput,
  Select,
  Text,
} from '@/components/ui'
import { ClinicPaymentsModal } from './ClinicPaymentsModal'

export function SuperClinicsPage() {
  const { user } = useAuth()
  const run = useToastAction()
  const { data: clinics = [], isLoading } = useClinics()
  const { data: plans = [] } = usePlans()
  const { create, update, remove } = useClinicAdminActions()
  const [newOpen, setNewOpen] = useState(false)
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null)
  const [toDeleteClinic, setToDeleteClinic] = useState<Clinic | null>(null)

  const confirmRemoveClinic = async () => {
    if (!toDeleteClinic) return
    const ok = await run(() => remove.mutateAsync(toDeleteClinic.id), {
      success: 'Consultorio eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDeleteClinic(null)
  }

  return (
    <AppLayout
      title="Consultorios"
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          Administrá todos los consultorios y sus administradores.
          <InfoTooltip text="Los límites del plan se comparan contra el uso real del consultorio: pacientes, admins, planes alimentarios y alimentos." />
        </span>
      }
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setNewOpen(true)}>
          Nuevo consultorio
        </Button>
      }
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : clinics.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin consultorios"
          description="Creá el primer consultorio para empezar."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {clinics.map((clinic) => (
            <ClinicCard
              key={clinic.id}
              clinic={clinic}
              plan={plans.find((p) => p.id === clinic.subscription?.planId)}
              onEdit={() => setEditingClinic(clinic)}
              onRemoveClinic={() => setToDeleteClinic(clinic)}
            />
          ))}
        </div>
      )}

      {newOpen && (
        <ClinicFormModal
          plans={plans}
          saving={create.isPending}
          onClose={() => setNewOpen(false)}
          onSubmit={async (data) => {
            const ok = await run(
              () =>
                create.mutateAsync({
                  ...data,
                  ownerUid: user?.uid ?? '',
                  adminUids: [],
                }),
              { success: 'Consultorio creado', error: 'No se pudo crear el consultorio' },
            )
            if (ok) setNewOpen(false)
          }}
        />
      )}

      {editingClinic && (
        <ClinicFormModal
          clinic={editingClinic}
          plans={plans}
          saving={update.isPending}
          onClose={() => setEditingClinic(null)}
          onSubmit={async (data) => {
            const ok = await run(
              () => update.mutateAsync({ clinicId: editingClinic.id, data }),
              { success: 'Consultorio actualizado', error: 'No se pudo actualizar el consultorio' },
            )
            if (ok) setEditingClinic(null)
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDeleteClinic}
        onClose={() => setToDeleteClinic(null)}
        onConfirm={confirmRemoveClinic}
        title="Eliminar consultorio"
        description={`¿Querés eliminar el consultorio "${toDeleteClinic?.name}"? Esta acción no se puede deshacer.`}
        loading={remove.isPending}
      />
    </AppLayout>
  )
}

type ClinicFormData = Pick<Clinic, 'name' | 'logoURL' | 'subscription'>
type ClinicFormErrors = Partial<Record<'name' | 'planId' | 'monthlyCost' | 'startDate', string>>

function ClinicFormModal({
  clinic,
  plans,
  saving,
  onClose,
  onSubmit,
}: {
  clinic?: Clinic
  plans: SubscriptionPlan[]
  saving?: boolean
  onClose: () => void
  onSubmit: (data: ClinicFormData) => Promise<void>
}) {
  const activePlans = plans.filter((p) => p.active || p.id === clinic?.subscription?.planId)
  const [name, setName] = useState(clinic?.name ?? '')
  const [planId, setPlanId] = useState(clinic?.subscription?.planId ?? '')
  const selectedPlan = plans.find((p) => p.id === planId)
  const [monthlyCost, setMonthlyCost] = useState(clinic?.subscription?.monthlyCost ?? selectedPlan?.price ?? 0)
  const [startDate, setStartDate] = useState(() => {
    if (clinic?.subscription?.startDate) return toDateInput(clinic.subscription.startDate)
    const dueDate = toDate(clinic?.subscription?.dueDate)
    return dueDate ? localDayKey(addMonths(dueDate, -1)) : localDayKey(new Date())
  })
  const [status, setStatus] = useState<ClinicSubscription['status']>(clinic?.subscription?.status ?? 'active')
  const [errors, setErrors] = useState<ClinicFormErrors>({})
  const { notify } = useToast()
  // Logo del clinic: mismo pipeline que Marca (data URL comprimida, sin Storage).
  // Como el super-admin edita acá, el write saltea el rate-limit por las rules.
  const [logoURL, setLogoURL] = useState<string>(clinic?.logoURL ?? '')
  const [logoProcessing, setLogoProcessing] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const handleLogoFile = async (file?: File) => {
    if (!file) return
    setLogoProcessing(true)
    try {
      setLogoURL(await fileToLogoDataUrl(file))
    } catch (err) {
      notify(err instanceof LogoImageError ? err.message : 'No se pudo procesar la imagen.', 'error')
    } finally {
      setLogoProcessing(false)
    }
  }

  const clearError = (field: keyof ClinicFormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validate = () => {
    const next: ClinicFormErrors = {}
    const trimmedName = name.trim()

    if (trimmedName.length < 2) next.name = 'Ingresá el nombre del consultorio.'
    if (!planId) {
      next.planId = activePlans.length
        ? 'Elegí el plan de suscripción del consultorio.'
        : 'Primero creá al menos un plan activo.'
    }
    if (monthlyCost <= 0) next.monthlyCost = 'Ingresá un costo mensual mayor a cero.'
    if (!startDate) next.startDate = 'Elegí la fecha de ingreso del consultorio.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    const plan = plans.find((p) => p.id === planId)
    const firstDueDate = addMonths(parseDateInput(startDate), 1)
    await onSubmit({
      name: name.trim(),
      logoURL,
      subscription: planId
        ? {
            planId,
            monthlyCost: monthlyCost || plan?.price || 0,
            status,
            startDate: dateInputToTimestamp(startDate),
            dueDate: dateInputToTimestamp(localDayKey(firstDueDate)),
            lastPaymentDate: clinic?.subscription?.lastPaymentDate,
          }
        : undefined,
    })
  }

  return (
    <Modal open onClose={onClose} title={clinic ? `Editar consultorio — ${clinic.name}` : 'Nuevo consultorio'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Nombre del consultorio"
            hint="Lo verás en el selector de consultorios."
            error={errors.name}
            required
          >
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                clearError('name')
              }}
              placeholder="Ej. Consultorio Nutrar"
              invalid={!!errors.name}
              autoFocus
            />
          </FormField>
          <FormField
            label="Logo"
            hint="Cuadrado; se recorta y comprime solo. Aparece en el selector y en la marca del consultorio."
          >
            <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-zinc-200 bg-zinc-50/60 px-3 py-2">
              <LogoImage
                src={logoURL}
                alt={name || 'Logo del consultorio'}
                className="size-11 shrink-0 rounded-xl"
                iconClassName="size-5"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-600">
                {logoURL ? 'Logo cargado' : 'Sin logo'}
              </span>
              {logoURL && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setLogoURL('')}>
                  Quitar
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={<Upload className="size-3.5" />}
                loading={logoProcessing}
                onClick={() => logoInputRef.current?.click()}
              >
                Subir logo
              </Button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handleLogoFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          </FormField>
          <FormField
            label="Plan de suscripción"
            hint="Define precio y límites del tenant."
            error={errors.planId}
            required
          >
            <Select
              value={planId}
              onChange={(e) => {
                const nextPlan = plans.find((p) => p.id === e.target.value)
                setPlanId(e.target.value)
                clearError('planId')
                if (nextPlan) {
                  setMonthlyCost(nextPlan.price)
                  clearError('monthlyCost')
                } else {
                  setMonthlyCost(0)
                }
              }}
              placeholder={activePlans.length ? 'Elegí un plan' : 'No hay planes'}
              invalid={!!errors.planId}
              options={activePlans.map((p) => ({
                value: p.id,
                label: `${p.name} · ${formatCurrency(p.price)}`,
              }))}
            />
          </FormField>
          <FormField label="Estado de suscripción" required>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ClinicSubscription['status'])}
              options={[
                { value: 'active', label: 'Activa' },
                { value: 'suspended', label: 'Suspendida' },
              ]}
            />
          </FormField>
          <FormField label="Costo mensual" error={errors.monthlyCost} required>
            <MoneyInput
              value={monthlyCost}
              onChange={(value) => {
                setMonthlyCost(value)
                clearError('monthlyCost')
              }}
              invalid={!!errors.monthlyCost}
            />
          </FormField>
          <FormField
            label="Fecha de ingreso"
            hint="El primer vencimiento se calcula automáticamente a 1 mes."
            error={errors.startDate}
            required
          >
            <DateInput
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                clearError('startDate')
              }}
              invalid={!!errors.startDate}
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={submit}>
            {clinic ? 'Guardar cambios' : 'Crear consultorio'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ClinicCard({
  clinic,
  plan,
  onEdit,
  onRemoveClinic,
}: {
  clinic: Clinic
  plan?: SubscriptionPlan
  onEdit: () => void
  onRemoveClinic: () => void
}) {
  const navigate = useNavigate()
  const { selectClinic } = useTenant()
  const run = useToastAction()
  const { data: members = [] } = useMembers(clinic.id)
  const { data: mealPlans = [] } = useMealPlans(clinic.id)
  const { data: foods = [] } = useFoods(clinic.id)
  const createMember = useCreateMember(clinic.id)
  const removeMember = useRemoveMember(clinic.id)
  const { removeAdmin } = useClinicAdminActions()

  const admins = members.filter((m) => m.role === 'admin')
  const subStatus = getPaymentStatus(clinic.subscription?.dueDate)
  const suspended = subStatus.state === 'blocked'

  const usage: ClinicUsage = {
    patients: members.filter((m) => m.role === 'user').length,
    admins: admins.length,
    mealPlans: mealPlans.length,
    foods: foods.length,
  }
  const overLimit = exceedsLimit(usage, plan)

  const [addOpen, setAddOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [adminToRemove, setAdminToRemove] = useState<Member | null>(null)

  const enterClinic = () => {
    selectClinic(clinic.id)
    navigate(defaultHomeForRole('admin'))
  }

  const closeAddAdmin = () => {
    setFullName('')
    setEmail('')
    setAddOpen(false)
  }

  const handleAddAdmin = async () => {
    if (fullName.trim().length < 2 || !email.trim()) return
    const ok = await run(
      () =>
        createMember.mutateAsync({
          fullName: fullName.trim(),
          email: email.trim(),
          role: 'admin',
          status: 'active',
        }),
      { success: 'Administrador agregado', error: 'No se pudo agregar el administrador' },
    )
    if (ok) {
      closeAddAdmin()
    }
  }

  const confirmRemoveAdmin = async () => {
    if (!adminToRemove) return
    const ok = await run(
      async () => {
        await removeMember.mutateAsync(adminToRemove.id)
        if (adminToRemove.uid)
          await removeAdmin.mutateAsync({ clinicId: clinic.id, uid: adminToRemove.uid })
      },
      { success: 'Administrador eliminado', error: 'No se pudo eliminar' },
    )
    if (ok) setAdminToRemove(null)
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <LogoImage
            src={clinic.logoURL}
            alt={clinic.name}
            className="size-10 shrink-0 rounded-xl"
            fallbackClassName="bg-brand-50 text-brand-600"
            fallbackIcon={Building2}
            iconClassName="size-5"
          />
          <div className="min-w-0">
            <Heading variant="card" className="truncate">
              {clinic.name}
            </Heading>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral">{admins.length} admin{admins.length === 1 ? '' : 's'}</Badge>
              {suspended && <Badge tone="red">Suspendido</Badge>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="secondary" leftIcon={<Wallet className="size-4" />} onClick={() => setPayOpen(true)}>
            Pagos
          </Button>
          <Button size="sm" variant="secondary" leftIcon={<LogIn className="size-4" />} onClick={enterClinic}>
            Entrar
          </Button>
          <IconButton
            icon={<Pencil className="size-4" />}
            label="Editar consultorio"
            onClick={onEdit}
          />
          <IconButton
            icon={<Trash2 className="size-4" />}
            label="Eliminar consultorio"
            tone="danger"
            onClick={onRemoveClinic}
          />
        </div>
      </div>

      {plan ? (
        <div className="mt-3 rounded-lg bg-surface-muted p-3">
          <div className="flex items-center justify-between gap-2">
            <Text variant="label">Plan {plan.name}</Text>
            {overLimit && (
              <Badge tone="amber">
                <AlertTriangle className="mr-1 inline size-3" />
                Límite superado
              </Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge tone="neutral">{usageLabel(usage.patients, plan.maxPatients)} pacientes</Badge>
            <Badge tone="neutral">{usageLabel(usage.mealPlans, plan.maxMealPlans)} planes</Badge>
            <Badge tone="neutral">{usageLabel(usage.foods, plan.maxFoods)} alimentos</Badge>
            <Badge tone="neutral">{usageLabel(usage.admins, plan.maxAdmins)} admins</Badge>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-400">Sin plan asignado.</p>
      )}

      <div className="mt-4 border-t border-zinc-100 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Administradores</p>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<UserPlus className="size-4" />}
            onClick={() => setAddOpen(true)}
          >
            Agregar
          </Button>
        </div>
        {admins.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin administradores.</p>
        ) : (
          <ul className="space-y-1">
            {admins.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ShieldCheck className="size-4 shrink-0 text-brand-600" />
                  <div className="min-w-0">
                    <Text variant="listItem" className="truncate">
                      {a.fullName}
                    </Text>
                    <Text variant="caption" className="truncate">
                      {a.email}
                    </Text>
                  </div>
                </div>
                <IconButton
                  icon={<Trash2 className="size-4" />}
                  label={`Quitar a ${a.fullName}`}
                  tone="danger"
                  onClick={() => setAdminToRemove(a)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={addOpen} onClose={closeAddAdmin} title={`Nuevo admin — ${clinic.name}`}>
        <div className="space-y-4">
          <FormField label="Nombre completo">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
          </FormField>
          <FormField
            label="Email"
            tooltip="El admin reclama su acceso iniciando sesión con este email."
          >
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
            <Button variant="secondary" onClick={closeAddAdmin}>
              Cancelar
            </Button>
            <Button loading={createMember.isPending} onClick={handleAddAdmin}>
              Agregar admin
            </Button>
          </div>
        </div>
      </Modal>

      {payOpen && <ClinicPaymentsModal clinic={clinic} onClose={() => setPayOpen(false)} />}

      <ConfirmDialog
        open={!!adminToRemove}
        onClose={() => setAdminToRemove(null)}
        onConfirm={confirmRemoveAdmin}
        title="Quitar administrador"
        description={`¿Querés quitar a ${adminToRemove?.fullName} como administrador de ${clinic.name}?`}
        confirmLabel="Quitar"
        loading={removeMember.isPending || removeAdmin.isPending}
      />
    </Card>
  )
}
