import { describe, expect, it } from 'vitest'
import type { Food, MealPlanDay } from '@/types'
import {
  buildFreeTextItem,
  buildItemFromFood,
  dayTotals,
  emptyDay,
  itemMacros,
  kcalFromMacros,
  mealTotals,
  pctOfTarget,
  planDailyAverage,
  resolveGrams,
  targetMacroGrams,
} from '@/utils/nutrition'

const arroz: Food = {
  id: 'seed-arroz-blanco-cocido',
  name: 'Arroz blanco cocido',
  category: 'cereales_legumbres',
  per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  measures: [{ name: 'taza', grams: 200 }],
  active: true,
  createdBy: 'test',
}

describe('resolveGrams', () => {
  it('g/ml pasan directo', () => {
    expect(resolveGrams(150, 'g', arroz)).toBe(150)
    expect(resolveGrams(250, 'ml', arroz)).toBe(250)
  })
  it('medida casera multiplica por sus gramos (case-insensitive)', () => {
    expect(resolveGrams(2, 'taza', arroz)).toBe(400)
    expect(resolveGrams(1, 'Taza', arroz)).toBe(200)
  })
  it('unidad desconocida o cantidad inválida → null', () => {
    expect(resolveGrams(1, 'puñado', arroz)).toBeNull()
    expect(resolveGrams(0, 'g', arroz)).toBeNull()
  })
})

describe('itemMacros', () => {
  it('escala per100 por los gramos resueltos', () => {
    const item = buildItemFromFood(arroz, 1, 'taza') // 200 g
    expect(itemMacros(item)).toEqual({
      kcal: 260,
      protein: 5.4,
      carbs: 56,
      fat: 0.6,
      fiber: 0.8,
    })
  })
  it('texto libre no suma macros', () => {
    expect(itemMacros(buildFreeTextItem('Ensalada de la casa', 1, 'plato'))).toBeNull()
  })
})

describe('totales', () => {
  const day: MealPlanDay = {
    label: 'Día tipo',
    meals: [
      { slot: 'desayuno', items: [buildItemFromFood(arroz, 100, 'g')] }, // 130 kcal
      { slot: 'almuerzo', items: [buildItemFromFood(arroz, 1, 'taza')] }, // 260 kcal
      { slot: 'cena', items: [buildFreeTextItem('Sopa', 1, 'plato')] }, // sin macros
    ],
  }

  it('mealTotals y dayTotals suman solo lo calculable', () => {
    expect(mealTotals(day.meals[0]!).kcal).toBeCloseTo(130, 5)
    expect(dayTotals(day).kcal).toBeCloseTo(390, 5)
    expect(dayTotals(day).protein).toBeCloseTo(8.1, 5)
  })

  it('planDailyAverage ignora días vacíos', () => {
    const plan = { days: [day, emptyDay('Martes')] }
    expect(planDailyAverage(plan).kcal).toBeCloseTo(390, 5) // 390/1, no /2
  })

  it('kcalFromMacros usa 4/4/9', () => {
    expect(kcalFromMacros({ protein: 10, carbs: 20, fat: 5 })).toBe(165)
  })
})

describe('objetivos', () => {
  it('targetMacroGrams reparte kcal según el split', () => {
    const grams = targetMacroGrams(2000, { proteinPct: 30, carbsPct: 40, fatPct: 30 })
    expect(grams.proteinG).toBeCloseTo(150, 5)
    expect(grams.carbsG).toBeCloseTo(200, 5)
    expect(grams.fatG).toBeCloseTo(66.67, 2)
  })
  it('pctOfTarget con y sin objetivo', () => {
    expect(pctOfTarget(1800, 2000)).toBeCloseTo(90, 5)
    expect(pctOfTarget(1800, 0)).toBeNull()
    expect(pctOfTarget(1800, undefined)).toBeNull()
  })
})
