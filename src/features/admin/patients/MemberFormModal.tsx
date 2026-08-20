import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Member } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useClinic } from '@/hooks/useClinic'
import { useMembers } from '@/hooks/useMembers'
import { usePlans } from '@/hooks/usePlans'
import { useTariffs } from '@/hooks/useTariffs'
import { Button, DateInput, FormField, Input, Modal, MoneyInput, Select, Text } from '@/components/ui'
import { toDateInput } from '@/utils/format'
import { dateInputToTimestamp, parseDateInput, todayDateInput } from '@/utils/dates'
import {
  emailLocalPart,
  normalizeEmailKey,
  suggestDomainFix,
  suggestLoginEmail,
  tenantEmailDomain,
} from '@/utils/loginEmail'
import { canCreateAdmin, usageLabel } from '@/utils/plans'
import { frequencyLabel, tariffLabel } from '@/utils/tariffs'
import { cn } from '@/utils/cn'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const schema = z
  .object({
    fullName: z.string().min(2, 'Ingresá el nombre'),
    // 'real' → el acceso es un email de verdad (permite recuperar contraseña).
    // 'internal' → usuario sin email: se arma un login sintético `local@clinic.com`.
    accessMode: z.enum(['real', 'internal']),
    realEmail: z.string().optional(),
    loginLocal: z
      .string()
      .regex(/^[a-z0-9._-]*$/, 'Usá solo minúsculas, números, puntos o guiones')
      .optional(),
    phone: z.string().optional(),
    birthDate: z.string().optional(),
    role: z.enum(['user', 'admin']),
    tariffId: z.string().optional(),
    monthlyCost: z.number().min(0),
    startDate: z.string().optional(),
    paymentDate: z.string().optional(),
    status: z.enum(['active', 'paused', 'overdue']),
  })
  .superRefine((v, ctx) => {
    if (v.accessMode === 'real') {
      if (!v.realEmail || !EMAIL_RE.test(v.realEmail.trim())) {
        ctx.addIssue({ path: ['realEmail'], code: z.ZodIssueCode.custom, message: 'Ingresá un email válido' })
      }
    } else if (!v.loginLocal || v.loginLocal.trim().length < 2) {
      ctx.addIssue({ path: ['loginLocal'], code: z.ZodIssueCode.custom, message: 'Ingresá el usuario (mín. 2)' })
    }
  })
type FormValues = z.infer<typeof schema>

const toTs = (value?: string) => dateInputToTimestamp(value)

/** Suma 1 mes exacto a una fecha YYYY-MM-DD (usa mediodía para evitar saltos de día). */
function plusOneMonth(dateStr: string): string {
  if (!dateStr) return ''
  const d = parseDateInput(dateStr)
  d.setMonth(d.getMonth() + 1)
  return toDateInput(d)
}

export function MemberFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Member, 'id' | 'uid'>) => void
  initial?: Member | null
  saving?: boolean
}) {
  const { activeClinicId, activeMembership } = useTenant()
  const { data: tariffs = [] } = useTariffs(activeClinicId ?? '')
  const { data: members = [] } = useMembers(activeClinicId ?? '')
  const { data: clinic } = useClinic(activeClinicId ?? '')
  const { data: plans = [] } = usePlans()
  const clinicName = activeMembership?.clinicName ?? 'Consultorio'
  const domain = tenantEmailDomain(clinicName)
  const isEditing = !!initial

  const today = todayDateInput()

  const {
    register,
    control,
    setValue,
    setError,
    clearErrors,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      accessMode: 'real',
      realEmail: '',
      loginLocal: '',
      phone: '',
      birthDate: '',
      role: 'user',
      tariffId: '',
      monthlyCost: 0,
      startDate: today,
      paymentDate: plusOneMonth(today),
      status: 'active',
    },
  })

  // Tarifas seleccionables: activas + la actual del paciente (aunque esté inactiva).
  const selectable = tariffs.filter((t) => t.active || t.id === initial?.tariffId)
  const fullName = useWatch({ control, name: 'fullName' })
  const role = useWatch({ control, name: 'role' })
  const accessMode = useWatch({ control, name: 'accessMode' })
  const realEmail = useWatch({ control, name: 'realEmail' })
  const emailTypoFix = accessMode === 'real' ? suggestDomainFix(realEmail ?? '') : null
  const tariffId = useWatch({ control, name: 'tariffId' })
  const selectedTariff = tariffs.find((t) => t.id === tariffId)
  const plan = plans.find((p) => p.id === clinic?.subscription?.planId)

  const tariffReg = register('tariffId')
  const startReg = register('startDate')
  const existingEmails = members
    .filter((m) => m.id !== initial?.id)
    .map((m) => m.loginEmail || m.email)
  const adminCount = members.filter((m) => m.role === 'admin' && m.id !== initial?.id).length
  const adminGate = role === 'admin' ? canCreateAdmin(plan, adminCount) : { allowed: true }
  const adminLimitHint =
    role === 'admin' && plan
      ? `Administradores del plan: ${usageLabel(adminCount + (initial?.role === 'admin' ? 1 : 0), plan.maxAdmins)}`
      : undefined

  const formValues = (): FormValues => {
    const existingLogin = initial?.loginEmail || initial?.email || ''
    // ¿El login existente es sintético (@dominio-del-clinic) o un email real?
    const existingIsSynthetic = existingLogin.endsWith(`@${domain}`)
    return {
    fullName: initial?.fullName ?? '',
    accessMode: existingLogin && !existingIsSynthetic ? 'real' : existingLogin ? 'internal' : 'real',
    realEmail: existingLogin && !existingIsSynthetic ? existingLogin : '',
    loginLocal: emailLocalPart(existingLogin),
    phone: initial?.phone ?? '',
    birthDate: toDateInput(initial?.birthDate),
    role: initial?.role ?? 'user',
    tariffId: initial?.tariffId ?? '',
    monthlyCost: initial?.monthlyCost ?? 0,
    startDate: initial ? toDateInput(initial.startDate) : today,
    paymentDate: initial ? toDateInput(initial.paymentDate) : plusOneMonth(today),
    status: initial?.status ?? 'active',
    }
  }

  useEffect(() => {
    if (open) reset(formValues())
  }, [initial, open, reset])

  const close = () => {
    reset(formValues())
    onClose()
  }

  const applySuggestedEmail = () => {
    const email = suggestLoginEmail(fullName, clinicName, existingEmails)
    setValue('loginLocal', emailLocalPart(email), { shouldDirty: true, shouldValidate: true })
  }

  const tariffHint =
    tariffs.length === 0
      ? 'No hay tarifas. Creá una en la sección Tarifas.'
      : selectedTariff
        ? `${frequencyLabel(selectedTariff.weeklyFrequency)} · autocompletó el costo`
        : 'Elegí un plan; autocompleta el costo'

  const submit = (v: FormValues) => {
    if (v.role === 'admin' && !adminGate.allowed) return
    // Con email real, ese es el acceso (cuenta Firebase real → reset por email).
    // Sin email, se arma el login sintético `local@dominio-del-clinic`.
    const loginEmail =
      v.accessMode === 'real'
        ? v.realEmail!.trim().toLowerCase()
        : `${v.loginLocal!.trim()}@${domain}`
    // El login se indexa por email: no puede haber dos pacientes con el mismo en el clinic.
    const emailTaken = existingEmails.some((e) => normalizeEmailKey(e) === normalizeEmailKey(loginEmail))
    if (emailTaken) {
      setError(v.accessMode === 'real' ? 'realEmail' : 'loginLocal', {
        type: 'manual',
        message: 'Ya existe un paciente con ese email de acceso',
      })
      return
    }
    const tariff = tariffs.find((t) => t.id === v.tariffId)
    onSubmit({
      fullName: v.fullName,
      email: loginEmail,
      loginEmail,
      authStatus: initial?.authStatus ?? 'pending_password',
      phone: v.phone,
      birthDate: toTs(v.birthDate),
      role: v.role,
      service: tariff?.name ?? '',
      tariffId: v.tariffId || undefined,
      weeklyFrequency: tariff?.weeklyFrequency,
      monthlyCost: v.monthlyCost ?? 0,
      startDate: initial ? initial.startDate : toTs(v.startDate),
      paymentDate: initial ? initial.paymentDate : toTs(v.paymentDate),
      status: v.status,
    })
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={initial ? 'Editar paciente' : 'Nuevo paciente'}
      size="xl"
      closeOnBackdrop={!saving}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" fullWidth className="sm:w-auto" onClick={close}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="member-form"
            fullWidth
            className="sm:w-auto"
            loading={saving}
            disabled={!adminGate.allowed}
          >
            {initial ? 'Guardar cambios' : 'Crear paciente'}
          </Button>
        </div>
      }
    >
      <form id="member-form" onSubmit={handleSubmit(submit)} className="space-y-5">
        {/* Datos personales */}
        <section className="space-y-3">
          <Text variant="label">Datos personales</Text>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nombre completo" error={errors.fullName?.message} required>
              <Input {...register('fullName')} invalid={!!errors.fullName} />
            </FormField>
            {isEditing ? (
              <FormField label="Email de acceso" tooltip="El email de acceso no se edita desde acá.">
                <Input value={initial?.loginEmail || initial?.email || ''} disabled />
              </FormField>
            ) : (
              <FormField
                label="Cómo ingresa el paciente"
                error={errors.realEmail?.message || errors.loginLocal?.message}
                tooltip="Con email real el paciente puede recuperar su contraseña solo si la olvida. Con alias del clinic, la recuperación la hacés vos re-emitiendo el acceso."
                required
              >
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-control)] bg-surface-muted p-1">
                    {(['real', 'internal'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setValue('accessMode', mode)
                          clearErrors(['realEmail', 'loginLocal'])
                        }}
                        className={cn(
                          'rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-sm font-medium transition-colors',
                          accessMode === mode
                            ? 'bg-surface text-zinc-900 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700',
                        )}
                      >
                        {mode === 'real' ? 'Email real ✓' : 'Alias del clinic'}
                      </button>
                    ))}
                  </div>

                  {accessMode === 'real' ? (
                    <div className="space-y-1.5">
                      <Input
                        type="email"
                        placeholder="paciente@gmail.com"
                        invalid={!!errors.realEmail}
                        {...register('realEmail')}
                      />
                      {/* Aviso blando de typo de dominio. El regex de validación
                          acepta `paciente@tigerfit.con`, así que sin esto el typo se
                          persiste y después el paciente no puede entrar nunca. */}
                      {emailTypoFix && (
                        <button
                          type="button"
                          onClick={() => setValue('realEmail', emailTypoFix)}
                          className="text-left text-xs font-medium text-amber-700 hover:text-amber-800"
                        >
                          ¿Quisiste decir <span className="underline">{emailTypoFix}</span>?
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="flex min-w-0 flex-1 rounded-[var(--radius-control)] border border-zinc-200 bg-surface focus-within:ring-2 focus-within:ring-brand-500">
                        <input
                          className="min-w-0 flex-1 rounded-l-[var(--radius-control)] bg-transparent px-3 py-2 text-base outline-none sm:text-sm"
                          {...register('loginLocal')}
                        />
                        <span className="flex shrink-0 items-center rounded-r-[var(--radius-control)] border-l border-zinc-200 bg-surface-muted px-3 text-sm text-zinc-500">
                          @{domain}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-10 shrink-0"
                        onClick={applySuggestedEmail}
                      >
                        Usar sugerido
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-zinc-400">
                    {accessMode === 'real'
                      ? 'Recomendado: si olvida la contraseña, la recupera solo con un email de restablecimiento.'
                      : `Se crea un usuario interno (usuario@${domain}). Rápido y sin pedir email, pero si la olvida el blanqueo lo hacés vos.`}
                  </p>
                </div>
              </FormField>
            )}
            <FormField label="Teléfono">
              <Input {...register('phone')} />
            </FormField>
            <FormField label="Fecha de nacimiento">
              <DateInput {...register('birthDate')} />
            </FormField>
          </div>
        </section>

        {/* Membresía y pago */}
        <section className="space-y-3 border-t border-zinc-100 pt-4">
          <Text variant="label">Membresía y pago</Text>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Tipo de usuario" hint={adminGate.reason ?? adminLimitHint}>
              <Select
                {...register('role')}
                options={[
                  { value: 'user', label: 'Paciente' },
                  { value: 'admin', label: 'Administrador' },
                ]}
              />
            </FormField>
            <FormField label="Estado">
              <Select
                {...register('status')}
                options={[
                  { value: 'active', label: 'Activo' },
                  { value: 'paused', label: 'Pausado' },
                  { value: 'overdue', label: 'Vencido' },
                ]}
              />
            </FormField>
            <FormField
              label="Servicio contratado (tarifa)"
              hint={tariffHint}
              tooltip="La tarifa define la cuota y la frecuencia semanal; al guardarla queda como snapshot del paciente."
            >
              <Select
                {...tariffReg}
                onChange={(e) => {
                  tariffReg.onChange(e)
                  const t = tariffs.find((x) => x.id === e.target.value)
                  if (t) setValue('monthlyCost', t.price, { shouldDirty: true })
                }}
                placeholder={selectable.length ? 'Elegí una tarifa' : 'Sin tarifas'}
                options={selectable.map((t) => ({ value: t.id, label: tariffLabel(t) }))}
              />
            </FormField>
            <FormField label="Costo mensual" error={errors.monthlyCost?.message}>
              <Controller
                control={control}
                name="monthlyCost"
                render={({ field }) => (
                  <MoneyInput value={field.value ?? 0} onChange={field.onChange} />
                )}
              />
            </FormField>
            <FormField
              label="Fecha de inicio"
              hint={isEditing ? 'Solo lectura en edición' : 'Autocompleta el próximo pago a 1 mes'}
            >
              <DateInput
                {...startReg}
                disabled={isEditing}
                onChange={(e) => {
                  startReg.onChange(e)
                  if (e.target.value) setValue('paymentDate', plusOneMonth(e.target.value))
                }}
              />
            </FormField>
            <FormField label="Próximo pago" hint={isEditing ? 'Se actualiza registrando pagos' : undefined}>
              <DateInput {...register('paymentDate')} disabled={isEditing} />
            </FormField>
          </div>
        </section>
      </form>
    </Modal>
  )
}
