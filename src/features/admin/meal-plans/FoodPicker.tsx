import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Info, Search } from 'lucide-react'
import type { Food, MealPlanItem, PreferredUnits } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useFoods } from '@/hooks/useFoods'
import { Button, FormField, Input, Modal } from '@/components/ui'
import { cn } from '@/utils/cn'
import { buildFreeTextItem, buildItemFromFood, itemMacros } from '@/utils/nutrition'
import { FOOD_CATEGORY_LABELS } from '../foods/foodCategories'
import { unitOptionsForFood } from './planMeta'

/** Tope de resultados del buscador: con 210+ alimentos, listar todo no ayuda. */
const MAX_RESULTS = 50

/**
 * Selector de ítems para una comida: buscá en el catálogo y elegí cantidad y
 * unidad, o cargá texto libre para lo que no está catalogado. Queda abierto
 * después de agregar porque una comida casi nunca lleva un solo alimento.
 */
export function FoodPicker({
  open,
  onClose,
  mealLabel,
  remaining,
  preferredUnits,
  showCalories,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  mealLabel: string
  /** Cupos que quedan en la comida (tope MEAL_PLAN_LIMITS.maxItemsPerMeal). */
  remaining: number
  preferredUnits: PreferredUnits
  showCalories: boolean
  onAdd: (item: MealPlanItem) => void
}) {
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const { data: foods = [], isLoading } = useFoods(clinicId)

  const [tab, setTab] = useState<'catalog' | 'free'>('catalog')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [unit, setUnit] = useState('g')
  const [freeName, setFreeName] = useState('')
  const [freeQuantity, setFreeQuantity] = useState('1')
  const [freeUnit, setFreeUnit] = useState('porción')
  const [lastAdded, setLastAdded] = useState('')

  // Solo alimentos activos: los inactivos siguen en el catálogo pero el
  // profesional los sacó de circulación a propósito.
  const activeFoods = useMemo(() => foods.filter((f) => f.active), [foods])

  const results = useMemo(() => {
    const q = search.toLowerCase().trim()
    const matches = q ? activeFoods.filter((f) => f.name.toLowerCase().includes(q)) : activeFoods
    return matches.slice(0, MAX_RESULTS)
  }, [activeFoods, search])

  const unitConfig = selected ? unitOptionsForFood(selected, preferredUnits) : null
  const qtyNumber = parseFloat(quantity)
  const previewItem =
    selected && qtyNumber > 0 ? buildItemFromFood(selected, qtyNumber, unit) : null
  const previewMacros = previewItem ? itemMacros(previewItem) : null
  const full = remaining <= 0

  const pickFood = (food: Food) => {
    const { defaultUnit } = unitOptionsForFood(food, preferredUnits)
    setSelected(food)
    setUnit(defaultUnit)
    // En gramos se arranca de 100 (la base de la tabla); en medida casera, de 1.
    setQuantity(defaultUnit === 'g' || defaultUnit === 'ml' ? '100' : '1')
  }

  const changeUnit = (next: string) => {
    const wasBase = unit === 'g' || unit === 'ml'
    const isBase = next === 'g' || next === 'ml'
    setUnit(next)
    // Al saltar entre gramos y medidas caseras, el default anterior deja de
    // tener sentido (100 tazas / 1 g): solo se ajusta si no lo tocaron.
    if (wasBase && !isBase && quantity === '100') setQuantity('1')
    if (!wasBase && isBase && quantity === '1') setQuantity('100')
  }

  const addFromCatalog = () => {
    if (!selected || !(qtyNumber > 0) || full) return
    onAdd(buildItemFromFood(selected, qtyNumber, unit))
    setLastAdded(selected.name)
    setSelected(null)
    setSearch('')
  }

  const addFreeText = () => {
    const name = freeName.trim()
    const qty = parseFloat(freeQuantity)
    if (!name || !(qty > 0) || full) return
    onAdd(buildFreeTextItem(name, qty, freeUnit.trim() || 'porción'))
    setLastAdded(name)
    setFreeName('')
    setFreeQuantity('1')
    setFreeUnit('porción')
  }

  const close = () => {
    setSelected(null)
    setSearch('')
    setLastAdded('')
    setTab('catalog')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Agregar a ${mealLabel}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500" aria-live="polite">
            {lastAdded ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check className="size-3.5" aria-hidden />
                "{lastAdded}" agregado
              </span>
            ) : (
              `Podés agregar ${remaining} ${remaining === 1 ? 'ítem más' : 'ítems más'} a esta comida.`
            )}
          </p>
          <Button variant="secondary" onClick={close}>
            Listo
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-[var(--radius-control)] border border-zinc-200 bg-surface p-1" role="tablist">
          <PickerTab active={tab === 'catalog'} onClick={() => setTab('catalog')}>
            Catálogo
          </PickerTab>
          <PickerTab active={tab === 'free'} onClick={() => setTab('free')}>
            Texto libre
          </PickerTab>
        </div>

        {full && (
          <p className="rounded-[var(--radius-control)] bg-amber-50 p-3 text-sm text-amber-700">
            Esta comida llegó al máximo de ítems. Quitá alguno para seguir agregando.
          </p>
        )}

        {tab === 'catalog' ? (
          selected ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Volver al buscador
              </button>

              <div className="rounded-[var(--radius-control)] border border-zinc-200 bg-zinc-50/60 p-3">
                <p className="text-sm font-semibold text-zinc-900">{selected.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {FOOD_CATEGORY_LABELS[selected.category]}
                  {showCalories ? ` · ${Math.round(selected.per100.kcal)} kcal/100 g` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Cantidad">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    invalid={!(qtyNumber > 0)}
                  />
                </FormField>
                <FormField label="Unidad">
                  {/* Select nativo armado acá (no el de ui) para poder agrupar
                      la preferencia del consultorio arriba de la lista */}
                  <select
                    value={unit}
                    onChange={(e) => changeUnit(e.target.value)}
                    className="h-11 w-full rounded-[var(--radius-control)] border border-zinc-200 bg-surface px-3 text-base text-zinc-900 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 sm:h-10 sm:text-sm"
                  >
                    {unitConfig?.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-600" aria-live="polite">
                  {previewItem?.grams != null ? (
                    <>
                      ≈ {Math.round(previewItem.grams)} g
                      {showCalories && previewMacros
                        ? ` · ${Math.round(previewMacros.kcal)} kcal`
                        : ''}
                    </>
                  ) : (
                    <span className="text-zinc-400">Ingresá una cantidad válida</span>
                  )}
                </p>
                <Button onClick={addFromCatalog} disabled={!(qtyNumber > 0) || full}>
                  Agregar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar alimento"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {isLoading ? (
                <p className="rounded-[var(--radius-control)] bg-surface-muted p-3 text-sm text-zinc-500">
                  Cargando catálogo...
                </p>
              ) : activeFoods.length === 0 ? (
                <p className="rounded-[var(--radius-control)] bg-surface-muted p-3 text-sm text-zinc-500">
                  Tu catálogo está vacío. Importá el catálogo base o cargá alimentos desde la sección
                  Alimentos, o usá la pestaña "Texto libre".
                </p>
              ) : results.length === 0 ? (
                <p className="rounded-[var(--radius-control)] bg-surface-muted p-3 text-sm text-zinc-500">
                  No encontramos "{search.trim()}" en tu catálogo. Podés cargarlo como texto libre.
                </p>
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  {results.map((food) => (
                    <li key={food.id}>
                      <button
                        type="button"
                        onClick={() => pickFood(food)}
                        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-control)] border border-transparent px-3 py-2 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-zinc-800">
                            {food.name}
                          </span>
                          <span className="block text-xs text-zinc-500">
                            {FOOD_CATEGORY_LABELS[food.category]}
                          </span>
                        </span>
                        {showCalories && (
                          <span className="shrink-0 text-xs text-zinc-500">
                            {Math.round(food.per100.kcal)} kcal/100 g
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                  {activeFoods.length > results.length && (
                    <li className="px-3 py-1 text-xs text-zinc-400">
                      Mostramos {results.length} resultados. Refiná la búsqueda para ver el resto.
                    </li>
                  )}
                </ul>
              )}
            </div>
          )
        ) : (
          <div className="space-y-4">
            <p className="flex items-start gap-2 rounded-[var(--radius-control)] bg-sky-50 p-3 text-xs leading-relaxed text-sky-700">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Los ítems de texto libre no suman macros ni calorías al total del plan. Para que cuenten,
              cargá el alimento en tu catálogo.
            </p>
            <FormField label="Nombre" required>
              <Input
                placeholder="Ej. Tarta de verdura casera"
                value={freeName}
                onChange={(e) => setFreeName(e.target.value)}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Cantidad">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={freeQuantity}
                  onChange={(e) => setFreeQuantity(e.target.value)}
                />
              </FormField>
              <FormField label="Unidad">
                <Input
                  placeholder="Ej. porción, taza, unidad"
                  value={freeUnit}
                  onChange={(e) => setFreeUnit(e.target.value)}
                />
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={addFreeText}
                disabled={!freeName.trim() || !(parseFloat(freeQuantity) > 0) || full}
              >
                Agregar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function PickerTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-[calc(var(--radius-control)-2px)] px-4 py-1.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active ? 'bg-brand-600 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-50',
      )}
    >
      {children}
    </button>
  )
}
