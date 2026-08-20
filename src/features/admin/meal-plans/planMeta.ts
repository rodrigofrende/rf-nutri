import type { Food, MealPlan, MealPlanDay, MealPlanItem, MealPlanStatus, PreferredUnits } from '@/types'

/**
 * Borrador de plan en el editor: el MealPlan completo menos lo que pone el
 * sistema (id del doc, autor y updatedAt del service). Es el shape exacto que
 * viaja a useCreateMealPlan/useUpdateMealPlan al guardar.
 */
export type MealPlanDraft = Omit<MealPlan, 'id' | 'createdBy' | 'updatedAt'>

export const PLAN_STATUS_LABELS: Record<MealPlanStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  archived: 'Archivado',
}

export const PLAN_STATUS_TONES: Record<MealPlanStatus, 'green' | 'amber' | 'neutral'> = {
  active: 'green',
  draft: 'amber',
  archived: 'neutral',
}

/** Labels sugeridos al agregar días: primero el genérico, después la semana. */
export const DAY_LABEL_SUGGESTIONS = [
  'Día tipo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

/** Primer label sugerido que no esté usado (fallback "Día N" si se agotan). */
export function nextDayLabel(days: MealPlanDay[]): string {
  const used = new Set(days.map((d) => d.label.trim().toLowerCase()))
  const free = DAY_LABEL_SUGGESTIONS.find((label) => !used.has(label.toLowerCase()))
  return free ?? `Día ${days.length + 1}`
}

export interface UnitOption {
  value: string
  label: string
}

/**
 * Opciones de unidad para un alimento según la preferencia del consultorio:
 * `preferredUnits` define el ORDEN (qué se ofrece primero) y la preselección.
 * Las medidas caseras muestran su equivalencia para elegir sin adivinar.
 */
export function unitOptionsForFood(
  food: Pick<Food, 'measures'>,
  preferred: PreferredUnits,
): { options: UnitOption[]; defaultUnit: string } {
  const base: UnitOption[] = [
    { value: 'g', label: 'g (gramos)' },
    { value: 'ml', label: 'ml (mililitros)' },
  ]
  const household: UnitOption[] = (food.measures ?? []).map((m) => ({
    value: m.name,
    label: `${m.name} (${m.grams} g)`,
  }))

  if (preferred === 'household' && household.length > 0) {
    return { options: [...household, ...base], defaultUnit: household[0].value }
  }
  // 'grams' y 'both' arrancan en gramos; en 'both' las caseras quedan a un
  // click y la equivalencia en gramos se muestra igual en el ítem.
  return { options: [...base, ...household], defaultUnit: 'g' }
}

/**
 * Cantidad legible de un ítem: "1 taza (≈ 200 g)" si la unidad es casera y el
 * consultorio también trabaja en gramos; "200 g" a secas si ya está en g/ml.
 */
export function describeItemQuantity(item: MealPlanItem, preferred: PreferredUnits): string {
  const base = `${item.quantity} ${item.unit}`
  const u = item.unit.trim().toLowerCase()
  const isBaseUnit = u === 'g' || u === 'gr' || u === 'ml' || u === 'cc'
  if (isBaseUnit || item.grams == null || preferred === 'household') return base
  return `${base} (≈ ${Math.round(item.grams)} g)`
}
