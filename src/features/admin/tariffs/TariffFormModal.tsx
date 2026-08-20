import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Tariff, TariffIconKey, TariffKind } from '@/types'
import { Button, FormField, IconSelect, Input, Modal, MoneyInput, Select, Toggle } from '@/components/ui'
import { TARIFF_ICON_OPTIONS } from '@/utils/tariffIcons'
import { TARIFF_KIND_LABELS } from '@/utils/tariffs'

const TARIFF_ICON_VALUES = [
  'membership',
  'dumbbell',
  'activity',
  'heart',
  'users',
  'calendar',
  'star',
  'crown',
  'zap',
  'sparkles',
] as const satisfies readonly TariffIconKey[]

const TARIFF_KIND_VALUES = [
  'consulta',
  'tratamiento',
  'antropometria',
  'otro',
] as const satisfies readonly TariffKind[]

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  icon: z.enum(TARIFF_ICON_VALUES).optional(),
  kind: z.enum(TARIFF_KIND_VALUES),
  price: z.number().min(0),
  description: z.string().optional(),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  name: '',
  icon: 'calendar',
  kind: 'consulta',
  price: 0,
  description: '',
  active: true,
}

function valuesFromTariff(tariff?: Tariff | null): FormValues {
  if (!tariff) return DEFAULT_VALUES
  return {
    name: tariff.name,
    icon: tariff.icon ?? 'calendar',
    kind: tariff.kind ?? 'otro',
    price: tariff.price,
    description: tariff.description ?? '',
    active: tariff.active,
  }
}

export function TariffFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Tariff, 'id'>) => void
  initial?: Tariff | null
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
    if (open) reset(valuesFromTariff(initial))
  }, [initial, open, reset])

  const close = () => {
    reset(valuesFromTariff(initial))
    onClose()
  }

  const kindOptions = TARIFF_KIND_VALUES.map((value) => ({
    value,
    label: TARIFF_KIND_LABELS[value],
  }))

  return (
    <Modal open={open} onClose={close} title={initial ? 'Editar tarifa' : 'Nueva tarifa'} size="lg">
      <form onSubmit={handleSubmit((v) => onSubmit(v))} className="space-y-4">
        <FormField label="Icono de la tarifa">
          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <IconSelect
                value={field.value ?? 'calendar'}
                onChange={field.onChange}
                options={TARIFF_ICON_OPTIONS}
                placeholder="Elegir icono"
              />
            )}
          />
        </FormField>

        <FormField label="Nombre del servicio" error={errors.name?.message} required>
          <Input placeholder="Ej. Consulta de seguimiento" {...register('name')} invalid={!!errors.name} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Tipo">
            <Select options={kindOptions} {...register('kind')} />
          </FormField>
          <FormField label="Precio">
            <Controller
              control={control}
              name="price"
              render={({ field }) => <MoneyInput value={field.value ?? 0} onChange={field.onChange} />}
            />
          </FormField>
        </div>
        <FormField label="Descripción">
          <Input placeholder="Ej. 45 minutos, incluye antropometría" {...register('description')} />
        </FormField>

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Toggle
              checked={field.value}
              onChange={field.onChange}
              label="Activa (visible al registrar un cobro)"
              tooltip="Solo las tarifas activas aparecen al registrar un cobro o un turno."
            />
          )}
        />

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button type="button" variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Guardar' : 'Crear tarifa'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
