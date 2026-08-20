import { useEffect, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import type { Food, FoodCategory } from '@/types'
import { Button, FormField, IconButton, Input, Modal, Select, Toggle } from '@/components/ui'
import { FOOD_CATEGORY_LABELS, FOOD_CATEGORY_ORDER } from './foodCategories'

// Los inputs numéricos vacíos llegan como NaN con valueAsNumber: para los
// opcionales lo convertimos a undefined en vez de fallar la validación.
const optionalNumber = z.preprocess(
  (v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v),
  z.number().min(0, 'No puede ser negativo').optional(),
)

const measureSchema = z.object({
  name: z.string().min(1, 'Ingresá el nombre'),
  grams: z.number('Ingresá los gramos').positive('Debe ser mayor a 0'),
})

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  category: z.enum(FOOD_CATEGORY_ORDER as [FoodCategory, ...FoodCategory[]]),
  kcal: z.number('Ingresá las kcal').min(0, 'No puede ser negativo'),
  protein: z.number('Ingresá las proteínas').min(0, 'No puede ser negativo'),
  carbs: z.number('Ingresá los carbohidratos').min(0, 'No puede ser negativo'),
  fat: z.number('Ingresá las grasas').min(0, 'No puede ser negativo'),
  fiber: optionalNumber,
  measures: z.array(measureSchema),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  name: '',
  category: 'otros',
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: undefined,
  measures: [],
  active: true,
}

function valuesFromFood(food?: Food | null): FormValues {
  if (!food) return DEFAULT_VALUES
  return {
    name: food.name,
    category: food.category,
    kcal: food.per100.kcal,
    protein: food.per100.protein,
    carbs: food.per100.carbs,
    fat: food.per100.fat,
    fiber: food.per100.fiber,
    measures: food.measures ?? [],
    active: food.active,
  }
}

const CATEGORY_OPTIONS = FOOD_CATEGORY_ORDER.map((value) => ({
  value,
  label: FOOD_CATEGORY_LABELS[value],
}))

/** Input numérico con la unidad como sufijo adentro (kcal / g), para no repetirla en cada label. */
function SuffixInput({
  suffix,
  invalid,
  children,
}: {
  suffix: string
  invalid?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative">
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs ${invalid ? 'text-red-400' : 'text-zinc-400'}`}
      >
        {suffix}
      </span>
    </div>
  )
}

export function FoodFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Pick<Food, 'name' | 'category' | 'per100' | 'measures' | 'active'>) => void
  initial?: Food | null
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
  const { fields, append, remove } = useFieldArray({ control, name: 'measures' })

  useEffect(() => {
    if (open) reset(valuesFromFood(initial))
  }, [initial, open, reset])

  const close = () => {
    reset(valuesFromFood(initial))
    onClose()
  }

  const submit = (v: FormValues) => {
    onSubmit({
      name: v.name.trim(),
      category: v.category,
      per100: {
        kcal: v.kcal,
        protein: v.protein,
        carbs: v.carbs,
        fat: v.fat,
        // fiber vacío no viaja como undefined: Firestore rechaza undefined en updates
        ...(v.fiber != null ? { fiber: v.fiber } : {}),
      },
      measures: v.measures.map((m) => ({ name: m.name.trim(), grams: m.grams })),
      active: v.active,
    })
  }

  return (
    <Modal open={open} onClose={close} title={initial ? 'Editar alimento' : 'Nuevo alimento'} size="lg">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nombre" error={errors.name?.message} required>
            <Input placeholder="Ej. Arroz integral cocido" {...register('name')} invalid={!!errors.name} />
          </FormField>
          <FormField label="Categoría">
            <Select options={CATEGORY_OPTIONS} {...register('category')} />
          </FormField>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-zinc-700">Valores por 100 g / 100 ml</legend>
          <p className="mt-0.5 text-xs text-zinc-500">
            Cargá los valores cocidos si es como los prescribís en consulta.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <FormField label="Calorías" error={errors.kcal?.message}>
              <SuffixInput suffix="kcal" invalid={!!errors.kcal}>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className="pr-11"
                  {...register('kcal', { valueAsNumber: true })}
                  invalid={!!errors.kcal}
                />
              </SuffixInput>
            </FormField>
            <FormField label="Proteínas" error={errors.protein?.message}>
              <SuffixInput suffix="g" invalid={!!errors.protein}>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className="pr-8"
                  {...register('protein', { valueAsNumber: true })}
                  invalid={!!errors.protein}
                />
              </SuffixInput>
            </FormField>
            <FormField label="Carbohidratos" error={errors.carbs?.message}>
              <SuffixInput suffix="g" invalid={!!errors.carbs}>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className="pr-8"
                  {...register('carbs', { valueAsNumber: true })}
                  invalid={!!errors.carbs}
                />
              </SuffixInput>
            </FormField>
            <FormField label="Grasas" error={errors.fat?.message}>
              <SuffixInput suffix="g" invalid={!!errors.fat}>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className="pr-8"
                  {...register('fat', { valueAsNumber: true })}
                  invalid={!!errors.fat}
                />
              </SuffixInput>
            </FormField>
            <FormField label="Fibra" hint="Opcional" error={errors.fiber?.message}>
              <SuffixInput suffix="g" invalid={!!errors.fiber}>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className="pr-8"
                  {...register('fiber', { valueAsNumber: true })}
                  invalid={!!errors.fiber}
                />
              </SuffixInput>
            </FormField>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-zinc-700">Medidas caseras</legend>
          <div className="mt-0.5 flex items-start justify-between gap-3">
            <p className="text-xs text-zinc-500">
              Equivalencias en gramos para prescribir porciones (ej. 1 taza = 200 g).
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="size-4" />}
              onClick={() => append({ name: '', grams: 0 })}
            >
              Agregar
            </Button>
          </div>

          {fields.length > 0 && (
            <div className="mt-3 space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Ej. taza, cda, unidad"
                      aria-label={`Nombre de la medida ${i + 1}`}
                      {...register(`measures.${i}.name`)}
                      invalid={!!errors.measures?.[i]?.name}
                    />
                    {errors.measures?.[i]?.name && (
                      <p className="mt-1 text-xs text-red-500">{errors.measures[i]?.name?.message}</p>
                    )}
                  </div>
                  <div className="w-28 sm:w-32">
                    <SuffixInput suffix="g" invalid={!!errors.measures?.[i]?.grams}>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="pr-8"
                        placeholder="200"
                        aria-label={`Gramos de la medida ${i + 1}`}
                        {...register(`measures.${i}.grams`, { valueAsNumber: true })}
                        invalid={!!errors.measures?.[i]?.grams}
                      />
                    </SuffixInput>
                    {errors.measures?.[i]?.grams && (
                      <p className="mt-1 text-xs text-red-500">{errors.measures[i]?.grams?.message}</p>
                    )}
                  </div>
                  <IconButton
                    icon={<Trash2 className="size-4" />}
                    label={`Quitar medida ${i + 1}`}
                    tone="danger"
                    className="mt-2"
                    onClick={() => remove(i)}
                  />
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Toggle
              checked={field.value}
              onChange={field.onChange}
              label="Activo (aparece al armar planes)"
              tooltip="Los alimentos inactivos quedan en tu catálogo pero no se ofrecen en el buscador del plan."
            />
          )}
        />

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button type="button" variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Guardar' : 'Crear alimento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
