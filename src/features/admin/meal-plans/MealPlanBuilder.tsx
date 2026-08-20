import { useState } from 'react'
import { ArrowDown, ArrowUp, Clock, Copy, Plus, StickyNote, Trash2, X } from 'lucide-react'
import type { ClinicSettings, MealPlanDay, MealPlanItem, MealPlanMeal, MealSlot } from '@/types'
import { Button, Card, ConfirmDialog, FormField, IconButton, Input } from '@/components/ui'
import { cn } from '@/utils/cn'
import {
  MEAL_PLAN_LIMITS,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  MEAL_SLOT_SHORT_LABELS,
  dayTotals,
  emptyDay,
  itemMacros,
  mealTotals,
  type MacroTotals,
} from '@/utils/nutrition'
import { describeItemQuantity, nextDayLabel } from './planMeta'
import { FoodPicker } from './FoodPicker'

/**
 * Resumen de macros en una línea, respetando qué eligió mostrar el consultorio.
 * Devuelve null si no hay nada para mostrar (kcal y macros apagados).
 */
function macroLine(t: MacroTotals, settings: ClinicSettings): string | null {
  const parts: string[] = []
  if (settings.showCalories) parts.push(`${Math.round(t.kcal)} kcal`)
  if (settings.showMacros) {
    parts.push(`P ${Math.round(t.protein)} g`, `C ${Math.round(t.carbs)} g`, `G ${Math.round(t.fat)} g`)
  }
  return parts.length ? parts.join(' · ') : null
}

/** Las 6 comidas SIEMPRE completas y en orden, venga como venga el doc. */
function normalizedMeals(day: MealPlanDay): MealPlanMeal[] {
  return MEAL_SLOTS.map((slot) => day.meals.find((m) => m.slot === slot) ?? { slot, items: [] })
}

/** Copia profunda de un día (sin structuredClone para no depender del target). */
function cloneDay(day: MealPlanDay): MealPlanDay {
  return {
    ...day,
    meals: day.meals.map((meal) => ({
      ...meal,
      items: meal.items.map((item) => ({
        ...item,
        ...(item.per100 ? { per100: { ...item.per100 } } : {}),
      })),
    })),
  }
}

/**
 * Constructor de días y comidas del plan. Es un componente CONTROLADO: los
 * días viven en el draft del editor (que es quien guarda), acá solo se editan.
 */
export function MealPlanBuilder({
  days,
  onChange,
  settings,
}: {
  days: MealPlanDay[]
  onChange: (days: MealPlanDay[]) => void
  settings: ClinicSettings
}) {
  const [selected, setSelected] = useState(0)
  const [pickerSlot, setPickerSlot] = useState<MealSlot | null>(null)
  const [dayToDelete, setDayToDelete] = useState<number | null>(null)

  // Clamp por si se elimina el último día seleccionado
  const dayIndex = Math.min(selected, days.length - 1)
  const day = days[dayIndex]
  const meals = normalizedMeals(day)

  const updateDay = (index: number, patch: Partial<MealPlanDay>) => {
    onChange(days.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  const updateMeal = (slot: MealSlot, patch: Partial<MealPlanMeal>) => {
    updateDay(dayIndex, {
      meals: meals.map((m) => (m.slot === slot ? { ...m, ...patch } : m)),
    })
  }

  const updateItems = (slot: MealSlot, items: MealPlanItem[]) => updateMeal(slot, { items })

  const addItem = (slot: MealSlot, item: MealPlanItem) => {
    const meal = meals.find((m) => m.slot === slot)
    if (!meal || meal.items.length >= MEAL_PLAN_LIMITS.maxItemsPerMeal) return
    updateItems(slot, [...meal.items, item])
  }

  const removeItem = (slot: MealSlot, index: number) => {
    const meal = meals.find((m) => m.slot === slot)
    if (!meal) return
    updateItems(slot, meal.items.filter((_, i) => i !== index))
  }

  const moveItem = (slot: MealSlot, index: number, dir: -1 | 1) => {
    const meal = meals.find((m) => m.slot === slot)
    if (!meal) return
    const to = index + dir
    if (to < 0 || to >= meal.items.length) return
    const items = [...meal.items]
    ;[items[index], items[to]] = [items[to], items[index]]
    updateItems(slot, items)
  }

  const patchItem = (slot: MealSlot, index: number, patch: Partial<MealPlanItem>) => {
    const meal = meals.find((m) => m.slot === slot)
    if (!meal) return
    updateItems(slot, meal.items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  const addDay = () => {
    if (days.length >= MEAL_PLAN_LIMITS.maxDays) return
    onChange([...days, emptyDay(nextDayLabel(days))])
    setSelected(days.length)
  }

  const duplicateDay = () => {
    if (days.length >= MEAL_PLAN_LIMITS.maxDays) return
    const copy = cloneDay(day)
    copy.label = `${day.label} (copia)`
    onChange([...days.slice(0, dayIndex + 1), copy, ...days.slice(dayIndex + 1)])
    setSelected(dayIndex + 1)
  }

  const removeDay = (index: number) => {
    if (days.length <= 1) return
    onChange(days.filter((_, i) => i !== index))
    setSelected((cur) => Math.max(0, cur > index ? cur - 1 : Math.min(cur, days.length - 2)))
    setDayToDelete(null)
  }

  const dayHasItems = (d: MealPlanDay) => d.meals.some((m) => m.items.length > 0)
  const pickerMeal = pickerSlot ? meals.find((m) => m.slot === pickerSlot) : null
  const dayLine = macroLine(dayTotals(day), settings)

  return (
    <div className="space-y-4">
      {/* Chips de días: scrolleables en mobile, sin scrollbar visible */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Días del plan"
      >
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === dayIndex}
            onClick={() => setSelected(i)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              i === dayIndex
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-zinc-200 bg-surface text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
            )}
          >
            {d.label || `Día ${i + 1}`}
          </button>
        ))}
        {days.length < MEAL_PLAN_LIMITS.maxDays && (
          <button
            type="button"
            onClick={addDay}
            className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] border border-dashed border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Plus className="size-4" aria-hidden />
            Agregar día
          </button>
        )}
      </div>

      {/* Cabecera del día: renombrar, duplicar, eliminar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <FormField label="Nombre del día">
              <Input
                value={day.label}
                onChange={(e) => updateDay(dayIndex, { label: e.target.value })}
                placeholder="Ej. Día tipo, Lunes"
              />
            </FormField>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={<Copy className="size-4" />}
              onClick={duplicateDay}
              disabled={days.length >= MEAL_PLAN_LIMITS.maxDays}
            >
              Duplicar día
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={<Trash2 className="size-4" />}
              className="text-red-600 hover:bg-red-50"
              disabled={days.length <= 1}
              onClick={() => (dayHasItems(day) ? setDayToDelete(dayIndex) : removeDay(dayIndex))}
            >
              Eliminar día
            </Button>
          </div>
        </div>
      </Card>

      {/* Las 6 comidas siempre visibles, en el orden del día */}
      <div className="space-y-3">
        {meals.map((meal) => (
          <MealSection
            key={meal.slot}
            meal={meal}
            settings={settings}
            onPatchMeal={(patch) => updateMeal(meal.slot, patch)}
            onAddClick={() => setPickerSlot(meal.slot)}
            onRemoveItem={(i) => removeItem(meal.slot, i)}
            onMoveItem={(i, dir) => moveItem(meal.slot, i, dir)}
            onPatchItem={(i, patch) => patchItem(meal.slot, i, patch)}
          />
        ))}
      </div>

      {/* Total del día pegado abajo: la referencia queda a la vista mientras se carga */}
      {dayLine && (
        <div className="sticky bottom-0 z-10 pb-1">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-brand-200 bg-brand-50/95 px-4 py-3 shadow-sm backdrop-blur">
            <span className="text-sm font-semibold text-brand-800">
              Total del día · {day.label || `Día ${dayIndex + 1}`}
            </span>
            <span className="text-sm font-medium text-brand-700">{dayLine}</span>
          </div>
        </div>
      )}

      <FoodPicker
        open={!!pickerSlot}
        onClose={() => setPickerSlot(null)}
        mealLabel={pickerSlot ? MEAL_SLOT_SHORT_LABELS[pickerSlot] : ''}
        remaining={pickerMeal ? MEAL_PLAN_LIMITS.maxItemsPerMeal - pickerMeal.items.length : 0}
        preferredUnits={settings.preferredUnits}
        showCalories={settings.showCalories}
        onAdd={(item) => pickerSlot && addItem(pickerSlot, item)}
      />

      <ConfirmDialog
        open={dayToDelete !== null}
        onClose={() => setDayToDelete(null)}
        onConfirm={() => dayToDelete !== null && removeDay(dayToDelete)}
        title="Eliminar día"
        description={`El día "${dayToDelete !== null ? days[dayToDelete]?.label : ''}" tiene comidas cargadas. ¿Querés eliminarlo igual?`}
      />
    </div>
  )
}

function MealSection({
  meal,
  settings,
  onPatchMeal,
  onAddClick,
  onRemoveItem,
  onMoveItem,
  onPatchItem,
}: {
  meal: MealPlanMeal
  settings: ClinicSettings
  onPatchMeal: (patch: Partial<MealPlanMeal>) => void
  onAddClick: () => void
  onRemoveItem: (index: number) => void
  onMoveItem: (index: number, dir: -1 | 1) => void
  onPatchItem: (index: number, patch: Partial<MealPlanItem>) => void
}) {
  const totalsLine = meal.items.length > 0 ? macroLine(mealTotals(meal), settings) : null
  const atLimit = meal.items.length >= MEAL_PLAN_LIMITS.maxItemsPerMeal

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">{MEAL_SLOT_LABELS[meal.slot]}</h3>
          <div className="relative">
            <Clock className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="time"
              value={meal.time ?? ''}
              onChange={(e) => onPatchMeal({ time: e.target.value })}
              aria-label={`Horario sugerido de ${MEAL_SLOT_LABELS[meal.slot]}`}
              className="h-8 rounded-[var(--radius-control)] border border-zinc-200 bg-surface pl-7 pr-2 text-xs text-zinc-700 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          leftIcon={<Plus className="size-4" />}
          onClick={onAddClick}
          disabled={atLimit}
        >
          Agregar alimento
        </Button>
      </div>

      {atLimit && (
        <p className="mt-2 text-xs text-amber-600">
          Llegaste al máximo de {MEAL_PLAN_LIMITS.maxItemsPerMeal} ítems por comida.
        </p>
      )}

      {meal.items.length === 0 ? (
        <p className="mt-3 rounded-[var(--radius-control)] border border-dashed border-zinc-200 bg-surface-muted p-3 text-center text-xs text-zinc-400">
          Sin ítems todavía
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100">
          {meal.items.map((item, i) => (
            <ItemRow
              key={`${item.name}-${i}`}
              item={item}
              settings={settings}
              isFirst={i === 0}
              isLast={i === meal.items.length - 1}
              onRemove={() => onRemoveItem(i)}
              onMove={(dir) => onMoveItem(i, dir)}
              onPatch={(patch) => onPatchItem(i, patch)}
            />
          ))}
        </ul>
      )}

      {totalsLine && (
        <p className="mt-2 border-t border-zinc-100 pt-2 text-right text-xs font-medium text-zinc-600">
          Total: {totalsLine}
        </p>
      )}

      <div className="mt-3">
        <Input
          value={meal.notes ?? ''}
          onChange={(e) => onPatchMeal({ notes: e.target.value })}
          placeholder={`Notas de ${MEAL_SLOT_SHORT_LABELS[meal.slot].toLowerCase()} (opcional)`}
          aria-label={`Notas de ${MEAL_SLOT_LABELS[meal.slot]}`}
          className="h-9 text-xs sm:h-9"
        />
      </div>
    </Card>
  )
}

function ItemRow({
  item,
  settings,
  isFirst,
  isLast,
  onRemove,
  onMove,
  onPatch,
}: {
  item: MealPlanItem
  settings: ClinicSettings
  isFirst: boolean
  isLast: boolean
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onPatch: (patch: Partial<MealPlanItem>) => void
}) {
  const macros = itemMacros(item)
  const line = macros ? macroLine(macros, settings) : null
  const showNotes = item.notes !== undefined
  const anyTotalsVisible = settings.showCalories || settings.showMacros

  return (
    <li className="py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-800">
            {item.name}
            <span className="ml-2 font-normal text-zinc-500">
              {describeItemQuantity(item, settings.preferredUnits)}
            </span>
          </p>
          {line ? (
            <p className="text-xs text-zinc-500">{line}</p>
          ) : anyTotalsVisible ? (
            // Texto libre o unidad sin equivalencia: se avisa que no suma
            <p className="text-xs text-zinc-400">No suma macros</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            icon={<ArrowUp className="size-4" />}
            label={`Subir ${item.name}`}
            size="sm"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className={cn(isFirst && 'opacity-30')}
          />
          <IconButton
            icon={<ArrowDown className="size-4" />}
            label={`Bajar ${item.name}`}
            size="sm"
            onClick={() => onMove(1)}
            disabled={isLast}
            className={cn(isLast && 'opacity-30')}
          />
          <IconButton
            icon={<StickyNote className="size-4" />}
            label={showNotes ? `Ocultar nota de ${item.name}` : `Agregar nota a ${item.name}`}
            size="sm"
            tone={showNotes ? 'brand' : 'default'}
            // Abrir la nota = definir notes '' (se limpia al guardar si queda vacía)
            onClick={() => onPatch({ notes: showNotes ? undefined : '' })}
          />
          <IconButton
            icon={<X className="size-4" />}
            label={`Quitar ${item.name}`}
            size="sm"
            tone="danger"
            onClick={onRemove}
          />
        </div>
      </div>
      {showNotes && (
        <Input
          value={item.notes ?? ''}
          onChange={(e) => onPatch({ notes: e.target.value })}
          placeholder="Ej. sin sal, cocido al vapor"
          aria-label={`Nota de ${item.name}`}
          className="mt-1.5 h-8 text-xs sm:h-8"
        />
      )}
    </li>
  )
}
