import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { TariffKind } from '@/types'
import type { NewPatientPayment } from '@/services/paymentsService'
import { useMembers } from '@/hooks/useMembers'
import { useTariffs } from '@/hooks/useTariffs'
import { Button, DateInput, FormField, Modal, MoneyInput, Select, Textarea } from '@/components/ui'
import { parseDateInput, todayDateInput } from '@/utils/dates'
import { TARIFF_KIND_LABELS, tariffLabel } from '@/utils/tariffs'

const TARIFF_KIND_VALUES = [
  'consulta',
  'tratamiento',
  'antropometria',
  'otro',
] as const satisfies readonly TariffKind[]

const schema = z.object({
  memberId: z.string().min(1, 'Elegí un paciente'),
  tariffId: z.string().optional(),
  serviceType: z.enum(TARIFF_KIND_VALUES),
  amount: z.number().min(1, 'Ingresá el monto'),
  date: z.string().min(1, 'Ingresá la fecha'),
  comment: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function RecordPaymentModal({
  open,
  onClose,
  clinicId,
  onSubmit,
  saving,
  defaultMemberId,
}: {
  open: boolean
  onClose: () => void
  clinicId: string
  /** El caller agrega `createdBy` y ejecuta la mutación. */
  onSubmit: (data: Omit<NewPatientPayment, 'createdBy'>) => void
  saving?: boolean
  defaultMemberId?: string
}) {
  const { data: members = [] } = useMembers(clinicId)
  const { data: tariffs = [] } = useTariffs(clinicId)

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      memberId: defaultMemberId ?? '',
      tariffId: '',
      serviceType: 'consulta',
      amount: 0,
      date: todayDateInput(),
      comment: '',
    },
  })

  const patientOptions = useMemo(
    () =>
      members
        .filter((m) => m.role === 'user')
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
        .map((m) => ({ value: m.id, label: m.fullName })),
    [members],
  )

  const activeTariffs = useMemo(() => tariffs.filter((t) => t.active), [tariffs])
  const tariffOptions = activeTariffs.map((t) => ({ value: t.id, label: tariffLabel(t) }))

  const serviceOptions = TARIFF_KIND_VALUES.map((k) => ({
    value: k,
    label: TARIFF_KIND_LABELS[k],
  }))

  // Elegir tarifa precarga monto y tipo de servicio, pero ambos quedan editables:
  // la tarifa es una referencia, no un contrato (descuentos, ajustes, etc.).
  const handleTariffChange = (tariffId: string) => {
    setValue('tariffId', tariffId)
    const tariff = activeTariffs.find((t) => t.id === tariffId)
    if (!tariff) return
    setValue('amount', tariff.price, { shouldValidate: true })
    setValue('serviceType', tariff.kind ?? 'otro')
  }

  const submit = (v: FormValues) => {
    const member = members.find((m) => m.id === v.memberId)
    if (!member) {
      setError('memberId', { message: 'Elegí un paciente' })
      return
    }
    onSubmit({
      memberId: member.id,
      memberUid: member.uid ?? '',
      memberName: member.fullName,
      serviceType: v.serviceType,
      ...(v.tariffId ? { tariffId: v.tariffId } : {}),
      amount: v.amount,
      date: parseDateInput(v.date),
      ...(v.comment?.trim() ? { comment: v.comment.trim() } : {}),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar cobro" size="lg">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <FormField label="Paciente" error={errors.memberId?.message} required>
          <Select
            options={patientOptions}
            placeholder="Elegí un paciente"
            {...register('memberId')}
            invalid={!!errors.memberId}
          />
        </FormField>

        <FormField
          label="Tarifa"
          hint="Opcional: al elegir una, se precargan el monto y el tipo de servicio."
        >
          <Controller
            control={control}
            name="tariffId"
            render={({ field }) => (
              <Select
                options={tariffOptions}
                placeholder="Sin tarifa"
                value={field.value ?? ''}
                onChange={(e) => handleTariffChange(e.target.value)}
              />
            )}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Tipo de servicio">
            <Select options={serviceOptions} {...register('serviceType')} />
          </FormField>
          <FormField label="Monto" error={errors.amount?.message} required>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <MoneyInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  invalid={!!errors.amount}
                />
              )}
            />
          </FormField>
          <FormField label="Fecha" error={errors.date?.message} required>
            <DateInput {...register('date')} invalid={!!errors.date} />
          </FormField>
        </div>

        <FormField label="Comentario">
          <Textarea rows={2} placeholder="Ej. Pagó en efectivo" {...register('comment')} />
        </FormField>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Registrar cobro
          </Button>
        </div>
      </form>
    </Modal>
  )
}
