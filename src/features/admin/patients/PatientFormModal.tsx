import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Member } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useMembers } from '@/hooks/useMembers'
import { Button, DateInput, FormField, Input, Modal, Select, Text, Textarea } from '@/components/ui'
import { toDateInput } from '@/utils/format'
import { dateInputToTimestamp, todayDateInput } from '@/utils/dates'
import {
  emailLocalPart,
  normalizeEmailKey,
  suggestDomainFix,
  suggestLoginEmail,
  tenantEmailDomain,
} from '@/utils/loginEmail'
import { ACTIVITY_LABELS } from '@/utils/anthropometry'
import { cn } from '@/utils/cn'
import { GOAL_TYPE_LABELS, SEX_LABELS } from './patientLabels'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Los campos numéricos de la ficha viajan como texto (inputs opcionales) y se
// parsean al guardar: RHF+zod con números opcionales convierte "" en NaN y
// ensucia la validación; así el vacío es simplemente vacío.
const optionalNumberField = (message: string) =>
  z
    .string()
    .optional()
    .refine((s) => !s || !s.trim() || Number.isFinite(Number(s.replace(',', '.'))), message)

const schema = z
  .object({
    fullName: z.string().min(2, 'Ingresá el nombre'),
    // 'real' → el acceso es un email de verdad (permite recuperar contraseña).
    // 'internal' → paciente sin email: se arma un login sintético `local@consultorio.com`.
    accessMode: z.enum(['real', 'internal']),
    realEmail: z.string().optional(),
    loginLocal: z
      .string()
      .regex(/^[a-z0-9._-]*$/, 'Usá solo minúsculas, números, puntos o guiones')
      .optional(),
    phone: z.string().optional(),
    birthDate: z.string().optional(),
    // Ficha clínica — todo opcional: la ficha se completa de a poco, consulta a consulta
    sex: z.enum(['female', 'male']).or(z.literal('')),
    heightCm: optionalNumberField('Ingresá una talla válida'),
    goalType: z.enum(['lose_weight', 'gain_muscle', 'maintain', 'health', 'sport', 'other']).or(z.literal('')),
    goal: z.string().optional(),
    targetWeightKg: optionalNumberField('Ingresá un peso válido'),
    targetKcal: optionalNumberField('Ingresá un valor válido'),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).or(z.literal('')),
    medicalHistory: z.string().optional(),
    allergies: z.string().optional(),
    intolerances: z.string().optional(),
    medications: z.string().optional(),
    habits: z.string().optional(),
    insuranceName: z.string().optional(),
    insurancePlan: z.string().optional(),
    insuranceMemberNumber: z.string().optional(),
    startDate: z.string().optional(),
    status: z.enum(['active', 'paused']),
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

/** Parsea un número opcional del form ('' → undefined; acepta coma decimal). */
function num(value?: string): number | undefined {
  if (!value || !value.trim()) return undefined
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function PatientFormModal({
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
  const { data: members = [] } = useMembers(activeClinicId ?? '')
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
      sex: '',
      heightCm: '',
      goalType: '',
      goal: '',
      targetWeightKg: '',
      targetKcal: '',
      activityLevel: '',
      medicalHistory: '',
      allergies: '',
      intolerances: '',
      medications: '',
      habits: '',
      insuranceName: '',
      insurancePlan: '',
      insuranceMemberNumber: '',
      startDate: today,
      status: 'active',
    },
  })

  const fullName = useWatch({ control, name: 'fullName' })
  const accessMode = useWatch({ control, name: 'accessMode' })
  const realEmail = useWatch({ control, name: 'realEmail' })
  const emailTypoFix = accessMode === 'real' ? suggestDomainFix(realEmail ?? '') : null

  const existingEmails = members
    .filter((m) => m.id !== initial?.id)
    .map((m) => m.loginEmail || m.email)

  const formValues = (): FormValues => {
    const existingLogin = initial?.loginEmail || initial?.email || ''
    // ¿El login existente es sintético (@dominio-del-consultorio) o un email real?
    const existingIsSynthetic = existingLogin.endsWith(`@${domain}`)
    return {
      fullName: initial?.fullName ?? '',
      accessMode: existingLogin && !existingIsSynthetic ? 'real' : existingLogin ? 'internal' : 'real',
      realEmail: existingLogin && !existingIsSynthetic ? existingLogin : '',
      loginLocal: emailLocalPart(existingLogin),
      phone: initial?.phone ?? '',
      birthDate: toDateInput(initial?.birthDate),
      sex: initial?.sex ?? '',
      heightCm: initial?.heightCm != null ? String(initial.heightCm) : '',
      goalType: initial?.goalType ?? '',
      goal: initial?.goal ?? '',
      targetWeightKg: initial?.targetWeightKg != null ? String(initial.targetWeightKg) : '',
      targetKcal: initial?.targetKcal != null ? String(initial.targetKcal) : '',
      activityLevel: initial?.activityLevel ?? '',
      medicalHistory: initial?.medicalHistory ?? '',
      allergies: initial?.allergies ?? '',
      intolerances: initial?.intolerances ?? '',
      medications: initial?.medications ?? '',
      habits: initial?.habits ?? '',
      insuranceName: initial?.healthInsurance?.name ?? '',
      insurancePlan: initial?.healthInsurance?.plan ?? '',
      insuranceMemberNumber: initial?.healthInsurance?.memberNumber ?? '',
      startDate: initial ? toDateInput(initial.startDate) : today,
      status: initial?.status ?? 'active',
    }
  }

  useEffect(() => {
    if (open) reset(formValues())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open, reset])

  const close = () => {
    reset(formValues())
    onClose()
  }

  const applySuggestedEmail = () => {
    const email = suggestLoginEmail(fullName, clinicName, existingEmails)
    setValue('loginLocal', emailLocalPart(email), { shouldDirty: true, shouldValidate: true })
  }

  const submit = (v: FormValues) => {
    // En edición el email de acceso no se toca desde acá (para eso está el
    // blanqueo/re-emisión en el detalle); en alta se resuelve según el modo.
    const loginEmail = isEditing
      ? initial!.loginEmail || initial!.email
      : v.accessMode === 'real'
        ? v.realEmail!.trim().toLowerCase()
        : `${v.loginLocal!.trim()}@${domain}`
    // El login se indexa por email: no puede haber dos pacientes con el mismo en el consultorio.
    const emailTaken = existingEmails.some((e) => normalizeEmailKey(e) === normalizeEmailKey(loginEmail))
    if (!isEditing && emailTaken) {
      setError(v.accessMode === 'real' ? 'realEmail' : 'loginLocal', {
        type: 'manual',
        message: 'Ya existe un paciente con ese email de acceso',
      })
      return
    }
    const insuranceName = v.insuranceName?.trim()
    onSubmit({
      fullName: v.fullName.trim(),
      email: loginEmail,
      loginEmail,
      authStatus: initial?.authStatus ?? 'pending_password',
      role: initial?.role ?? 'user',
      // Strings vacíos a propósito: un update con undefined no borra el campo
      // en Firestore (ignoreUndefinedProperties), y el admin tiene que poder
      // limpiar un texto de la ficha.
      phone: v.phone?.trim() ?? '',
      birthDate: toTs(v.birthDate),
      sex: v.sex || undefined,
      heightCm: num(v.heightCm),
      goalType: v.goalType || undefined,
      goal: v.goal?.trim() ?? '',
      targetWeightKg: num(v.targetWeightKg),
      targetKcal: num(v.targetKcal),
      activityLevel: v.activityLevel || undefined,
      medicalHistory: v.medicalHistory?.trim() ?? '',
      allergies: v.allergies?.trim() ?? '',
      intolerances: v.intolerances?.trim() ?? '',
      medications: v.medications?.trim() ?? '',
      habits: v.habits?.trim() ?? '',
      healthInsurance: insuranceName
        ? {
            name: insuranceName,
            ...(v.insurancePlan?.trim() ? { plan: v.insurancePlan.trim() } : {}),
            ...(v.insuranceMemberNumber?.trim() ? { memberNumber: v.insuranceMemberNumber.trim() } : {}),
          }
        : undefined,
      startDate: initial ? initial.startDate : toTs(v.startDate),
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
          <Button type="submit" form="patient-form" fullWidth className="sm:w-auto" loading={saving}>
            {initial ? 'Guardar cambios' : 'Crear paciente'}
          </Button>
        </div>
      }
    >
      <form id="patient-form" onSubmit={handleSubmit(submit)} className="space-y-5">
        {/* Datos personales */}
        <section className="space-y-3">
          <Text variant="label">Datos personales</Text>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nombre completo" error={errors.fullName?.message} required>
              <Input {...register('fullName')} invalid={!!errors.fullName} />
            </FormField>
            {isEditing ? (
              <FormField
                label="Email de acceso"
                tooltip="El email de acceso no se edita desde acá: usá 'Restablecer acceso' en el detalle del paciente."
              >
                <Input value={initial?.loginEmail || initial?.email || ''} disabled />
              </FormField>
            ) : (
              <FormField
                label="Cómo ingresa el paciente"
                error={errors.realEmail?.message || errors.loginLocal?.message}
                tooltip="Con email real el paciente puede recuperar su contraseña solo si la olvida. Con alias del consultorio, la recuperación la hacés vos re-emitiendo el acceso."
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
                        {mode === 'real' ? 'Email real ✓' : 'Alias del consultorio'}
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
                          acepta `paciente@gmail.con`, así que sin esto el typo se
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
            <FormField label="Fecha de nacimiento" hint="Necesaria para % de grasa y TMB por edad">
              <DateInput {...register('birthDate')} />
            </FormField>
          </div>
        </section>

        {/* Ficha clínica */}
        <section className="space-y-3 border-t border-zinc-100 pt-4">
          <Text variant="label">Ficha clínica</Text>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Sexo" hint="Requerido por las fórmulas antropométricas">
              <Select
                {...register('sex')}
                placeholder="Sin especificar"
                options={Object.entries(SEX_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </FormField>
            <FormField label="Talla (cm)" error={errors.heightCm?.message}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="170"
                invalid={!!errors.heightCm}
                {...register('heightCm')}
              />
            </FormField>
            <FormField label="Objetivo">
              <Select
                {...register('goalType')}
                placeholder="Sin definir"
                options={Object.entries(GOAL_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </FormField>
            <FormField label="Nivel de actividad">
              <Select
                {...register('activityLevel')}
                placeholder="Sin especificar"
                options={Object.entries(ACTIVITY_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Objetivo en sus palabras">
                <Textarea
                  rows={2}
                  placeholder="Ej. quiero llegar cómoda al verano y dormir mejor"
                  {...register('goal')}
                />
              </FormField>
            </div>
            <FormField label="Peso objetivo (kg)" error={errors.targetWeightKg?.message}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="65"
                invalid={!!errors.targetWeightKg}
                {...register('targetWeightKg')}
              />
            </FormField>
            <FormField label="Meta calórica (kcal/día)" error={errors.targetKcal?.message}>
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                placeholder="1800"
                invalid={!!errors.targetKcal}
                {...register('targetKcal')}
              />
            </FormField>
            <FormField label="Antecedentes / patologías">
              <Textarea rows={2} placeholder="Ej. hipotiroidismo, HTA" {...register('medicalHistory')} />
            </FormField>
            <FormField label="Alergias">
              <Textarea rows={2} placeholder="Ej. maní, frutos secos" {...register('allergies')} />
            </FormField>
            <FormField label="Intolerancias">
              <Textarea rows={2} placeholder="Ej. lactosa" {...register('intolerances')} />
            </FormField>
            <FormField label="Medicación">
              <Textarea rows={2} placeholder="Ej. levotiroxina 75 mcg" {...register('medications')} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Hábitos" hint="Sueño, alcohol, tabaco, agua, actividad, preferencias">
                <Textarea rows={2} {...register('habits')} />
              </FormField>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Obra social">
              <Input placeholder="Ej. OSDE" {...register('insuranceName')} />
            </FormField>
            <FormField label="Plan">
              <Input placeholder="Ej. 210" {...register('insurancePlan')} />
            </FormField>
            <FormField label="N° de afiliado">
              <Input {...register('insuranceMemberNumber')} />
            </FormField>
          </div>
        </section>

        {/* Estado */}
        <section className="space-y-3 border-t border-zinc-100 pt-4">
          <Text variant="label">Estado</Text>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Estado del paciente">
              <Select
                {...register('status')}
                options={[
                  { value: 'active', label: 'Activo' },
                  { value: 'paused', label: 'Pausado' },
                ]}
              />
            </FormField>
            <FormField label="Fecha de inicio" hint={isEditing ? 'Solo lectura en edición' : undefined}>
              <DateInput {...register('startDate')} disabled={isEditing} />
            </FormField>
          </div>
        </section>
      </form>
    </Modal>
  )
}
