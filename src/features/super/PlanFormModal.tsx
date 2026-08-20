import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { SubscriptionPlan } from '@/types'
import { Button, FormField, Input, Modal, MoneyInput, Select, Textarea, Toggle } from '@/components/ui'

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  price: z.number().min(0),
  maxAdmins: z.number().min(0),
  maxPatients: z.number().min(0),
  maxMealPlans: z.number().min(0),
  maxFoods: z.number().min(0),
  diaryEnabled: z.boolean(),
  maxDiaryPerPatient: z.number().min(0),
  whiteLabel: z.enum(['none', 'basic', 'full']),
  features: z.string().optional(),
  active: z.boolean(),
  customPricing: z.boolean(),
  highlighted: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  name: '',
  price: 0,
  maxAdmins: 1,
  maxPatients: 30,
  maxMealPlans: 50,
  maxFoods: 100,
  diaryEnabled: false,
  maxDiaryPerPatient: 0,
  whiteLabel: 'none',
  features: '',
  active: true,
  customPricing: false,
  highlighted: false,
}

function valuesFromPlan(plan?: SubscriptionPlan | null): FormValues {
  if (!plan) return DEFAULT_VALUES
  return {
    name: plan.name,
    price: plan.price,
    maxAdmins: plan.maxAdmins,
    maxPatients: plan.maxPatients,
    maxMealPlans: plan.maxMealPlans,
    maxFoods: plan.maxFoods,
    diaryEnabled: plan.diaryEnabled,
    maxDiaryPerPatient: plan.maxDiaryPerPatient,
    whiteLabel: plan.whiteLabel,
    features: (plan.features ?? []).join('\n'),
    active: plan.active,
    customPricing: plan.customPricing ?? false,
    highlighted: plan.highlighted ?? false,
  }
}

export function PlanFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<SubscriptionPlan, 'id'>) => void
  initial?: SubscriptionPlan | null
  saving?: boolean
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) reset(valuesFromPlan(initial))
  }, [initial, open, reset])

  const close = () => {
    reset(valuesFromPlan(initial))
    onClose()
  }

  const submit = (v: FormValues) => {
    onSubmit({
      name: v.name,
      price: v.price,
      maxAdmins: v.maxAdmins,
      maxPatients: v.maxPatients,
      maxMealPlans: v.maxMealPlans,
      maxFoods: v.maxFoods,
      diaryEnabled: v.diaryEnabled,
      maxDiaryPerPatient: v.maxDiaryPerPatient,
      whiteLabel: v.whiteLabel,
      features: (v.features ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      active: v.active,
      customPricing: v.customPricing,
      highlighted: v.highlighted,
    })
  }

  return (
    <Modal open={open} onClose={close} title={initial ? 'Editar plan' : 'Nuevo plan'} size="xl">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nombre del plan" error={errors.name?.message} required>
            <Input placeholder="Ej. Profesional" {...register('name')} invalid={!!errors.name} />
          </FormField>
          <FormField label="Precio mensual">
            <Controller
              control={control}
              name="price"
              render={({ field }) => <MoneyInput value={field.value ?? 0} onChange={field.onChange} />}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Máx. admins" hint="0 = ilimitado">
            <Input type="number" min={0} {...register('maxAdmins', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Pacientes (0 = ilimitado)">
            <Input type="number" min={0} {...register('maxPatients', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Máx. planes alimentarios" hint="0 = ilimitado">
            <Input type="number" min={0} {...register('maxMealPlans', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Máx. alimentos" hint="0 = ilimitado">
            <Input type="number" min={0} {...register('maxFoods', { valueAsNumber: true })} />
          </FormField>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <Controller
            control={control}
            name="diaryEnabled"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label="Diario del paciente"
                tooltip="Cuando está activo, los pacientes pueden registrar sus comidas (con foto), su peso y el check-in semanal."
              />
            )}
          />
          <FormField
            label="Máx. registros por paciente"
            hint="0 = ilimitado"
            tooltip="Este límite solo aplica si el diario del paciente está habilitado."
          >
            <Input type="number" min={0} {...register('maxDiaryPerPatient', { valueAsNumber: true })} />
          </FormField>
        </div>

        <FormField
          label="White-label"
          tooltip="Sin white-label no permite personalización. Basic habilita logo y colores. Full queda reservado para personalización completa."
        >
          <Select
            {...register('whiteLabel')}
            options={[
              { value: 'none', label: 'Sin white-label' },
              { value: 'basic', label: 'White-label (logo + colores)' },
              { value: 'full', label: 'White-label completo' },
            ]}
          />
        </FormField>

        <FormField label="Características (una por línea)">
          <Textarea
            {...register('features')}
            rows={4}
            placeholder={'Hasta 3 admins\n150 pacientes\nDiario alimentario con fotos'}
          />
        </FormField>

        <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <Controller
            control={control}
            name="highlighted"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label="Recomendado (destacado en la landing)"
                tooltip="La landing pública resalta este plan con un borde y el badge RECOMENDADO. Conviene marcarlo solo en uno."
              />
            )}
          />
          <Controller
            control={control}
            name="customPricing"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label="Precio a convenir (la landing muestra 'A medida')"
                tooltip="El precio no se publica: la landing muestra 'A medida' y el CTA invita a conversar. El precio interno se usa solo para ordenar los planes."
              />
            )}
          />
        </div>

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Toggle
              checked={field.value}
              onChange={field.onChange}
              label="Activo (disponible para asignar)"
              tooltip="Los planes inactivos no deberían asignarse a nuevos consultorios, pero se conservan para consultorios existentes."
            />
          )}
        />

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button type="button" variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Guardar' : 'Crear plan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
