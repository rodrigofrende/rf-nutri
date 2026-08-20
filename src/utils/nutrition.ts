import type { Food, MealPlan, MealPlanDay, MealPlanItem, MealPlanMeal, MealSlot } from '@/types'

/**
 * Cálculo nutricional — funciones PURAS sobre los ítems del plan.
 * Los macros se calculan desde el snapshot `per100` + `grams` del ítem, así el
 * plan se renderiza sin leer el catálogo y sobrevive a ediciones de alimentos.
 */

export const MEAL_SLOTS: MealSlot[] = [
  'desayuno',
  'colacion_am',
  'almuerzo',
  'merienda',
  'colacion_pm',
  'cena',
]

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  colacion_am: 'Colación (media mañana)',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  colacion_pm: 'Colación (tarde)',
  cena: 'Cena',
}

export const MEAL_SLOT_SHORT_LABELS: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  colacion_am: 'Colación AM',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  colacion_pm: 'Colación PM',
  cena: 'Cena',
}

/** Topes del plan embebido (espejados con la nota del doc en types/index.ts). */
export const MEAL_PLAN_LIMITS = {
  maxDays: 7,
  maxMealsPerDay: 6,
  maxItemsPerMeal: 20,
} as const

export interface MacroTotals {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export const EMPTY_TOTALS: MacroTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }

/**
 * Resuelve los gramos de una cantidad+unidad contra un alimento.
 * - 'g' / 'ml' → la cantidad tal cual
 * - medida casera → grams de la medida × cantidad
 * - unidad desconocida → null (ítem sin macros)
 */
export function resolveGrams(
  quantity: number,
  unit: string,
  food?: Pick<Food, 'measures'>,
): number | null {
  if (!quantity || quantity <= 0) return null
  const u = unit.trim().toLowerCase()
  if (u === 'g' || u === 'gr' || u === 'ml' || u === 'cc') return quantity
  const measure = food?.measures?.find((m) => m.name.trim().toLowerCase() === u)
  return measure ? measure.grams * quantity : null
}

/** Macros de un ítem desde su snapshot. Ítem sin grams/per100 → null (texto libre). */
export function itemMacros(item: MealPlanItem): MacroTotals | null {
  if (item.grams == null || item.grams <= 0 || !item.per100) return null
  const f = item.grams / 100
  return {
    kcal: item.per100.kcal * f,
    protein: item.per100.protein * f,
    carbs: item.per100.carbs * f,
    fat: item.per100.fat * f,
    fiber: (item.per100.fiber ?? 0) * f,
  }
}

function addTotals(a: MacroTotals, b: MacroTotals | null): MacroTotals {
  if (!b) return a
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  }
}

export function mealTotals(meal: MealPlanMeal): MacroTotals {
  return meal.items.reduce((acc, item) => addTotals(acc, itemMacros(item)), EMPTY_TOTALS)
}

export function dayTotals(day: MealPlanDay): MacroTotals {
  return day.meals.reduce((acc, meal) => addTotals(acc, mealTotals(meal)), EMPTY_TOTALS)
}

/** Promedio diario del plan (los días sin ítems no diluyen el promedio). */
export function planDailyAverage(plan: Pick<MealPlan, 'days'>): MacroTotals {
  const daysWithItems = plan.days.filter((d) => d.meals.some((m) => m.items.length > 0))
  if (daysWithItems.length === 0) return EMPTY_TOTALS
  const sum = daysWithItems.reduce((acc, day) => addTotals(acc, dayTotals(day)), EMPTY_TOTALS)
  const n = daysWithItems.length
  return {
    kcal: sum.kcal / n,
    protein: sum.protein / n,
    carbs: sum.carbs / n,
    fat: sum.fat / n,
    fiber: sum.fiber / n,
  }
}

/** kcal aportadas por los macros (4/4/9). Útil para chequear consistencia. */
export function kcalFromMacros(t: Pick<MacroTotals, 'protein' | 'carbs' | 'fat'>): number {
  return t.protein * 4 + t.carbs * 4 + t.fat * 9
}

export interface MacroTargetGrams {
  proteinG: number
  carbsG: number
  fatG: number
}

/** Objetivo de macros en gramos desde kcal target + split porcentual. */
export function targetMacroGrams(
  targetKcal: number,
  split: { proteinPct: number; carbsPct: number; fatPct: number },
): MacroTargetGrams {
  return {
    proteinG: (targetKcal * split.proteinPct) / 100 / 4,
    carbsG: (targetKcal * split.carbsPct) / 100 / 4,
    fatG: (targetKcal * split.fatPct) / 100 / 9,
  }
}

/** % del objetivo alcanzado (0 target → null, no hay contra qué comparar). */
export function pctOfTarget(value: number, target?: number): number | null {
  if (!target || target <= 0) return null
  return (value / target) * 100
}

/** Arma un ítem de plan desde un alimento del catálogo (snapshot completo). */
export function buildItemFromFood(
  food: Food,
  quantity: number,
  unit: string,
): MealPlanItem {
  const grams = resolveGrams(quantity, unit, food)
  return {
    foodId: food.id,
    name: food.name,
    quantity,
    unit,
    ...(grams != null ? { grams } : {}),
    per100: food.per100,
  }
}

/** Ítem de texto libre (sin macros). */
export function buildFreeTextItem(name: string, quantity: number, unit: string): MealPlanItem {
  return { name, quantity, unit }
}

/** Día vacío con las 6 comidas listas para completar. */
export function emptyDay(label: string): MealPlanDay {
  return {
    label,
    meals: MEAL_SLOTS.map((slot) => ({ slot, items: [] })),
  }
}
