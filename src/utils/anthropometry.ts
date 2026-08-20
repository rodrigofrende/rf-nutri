import type { AnthropometryRecord, ActivityLevel, Sex, Skinfolds } from '@/types'

/**
 * Derivados antropométricos — funciones PURAS sobre las mediciones crudas.
 * Nada de esto se persiste: se calcula al mostrar, con los datos del member
 * (sex, birthDate → edad, activityLevel) + el registro (peso, talla, pliegues,
 * perímetros). Fórmulas estándar de la práctica clínica/deportiva.
 */

// ---- IMC ----

export function bmi(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm) return null
  const h = heightCm / 100
  return weightKg / (h * h)
}

export type BmiCategory = 'bajo_peso' | 'normal' | 'sobrepeso' | 'obesidad_1' | 'obesidad_2' | 'obesidad_3'

/** Clasificación OMS para adultos. */
export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'bajo_peso'
  if (value < 25) return 'normal'
  if (value < 30) return 'sobrepeso'
  if (value < 35) return 'obesidad_1'
  if (value < 40) return 'obesidad_2'
  return 'obesidad_3'
}

export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  bajo_peso: 'Bajo peso',
  normal: 'Normal',
  sobrepeso: 'Sobrepeso',
  obesidad_1: 'Obesidad I',
  obesidad_2: 'Obesidad II',
  obesidad_3: 'Obesidad III',
}

// ---- Índices de perímetros ----

/** Índice cintura/cadera. */
export function waistHipRatio(waistCm?: number, hipCm?: number): number | null {
  if (!waistCm || !hipCm) return null
  return waistCm / hipCm
}

/** Índice cintura/talla (riesgo cardiometabólico si ≥ 0.5). */
export function waistHeightRatio(waistCm?: number, heightCm?: number): number | null {
  if (!waistCm || !heightCm) return null
  return waistCm / heightCm
}

// ---- % de grasa por pliegues ----

/**
 * Densidad corporal por Durnin & Womersley (1974): 4 pliegues
 * (bíceps + tríceps + subescapular + cresta ilíaca), coeficientes por sexo y
 * franja etaria. D = c − m × log10(Σ4).
 */
export function durninWomersleyDensity(
  skinfolds: Skinfolds,
  sex: Sex,
  ageYears: number,
): number | null {
  const { biceps, triceps, subscapular, iliacCrest } = skinfolds
  if (biceps == null || triceps == null || subscapular == null || iliacCrest == null) return null
  const sum = biceps + triceps + subscapular + iliacCrest
  if (sum <= 0) return null
  const table =
    sex === 'male'
      ? [
          { max: 17, c: 1.1533, m: 0.0643 },
          { max: 19, c: 1.162, m: 0.063 },
          { max: 29, c: 1.1631, m: 0.0632 },
          { max: 39, c: 1.1422, m: 0.0544 },
          { max: 49, c: 1.162, m: 0.07 },
          { max: Infinity, c: 1.1715, m: 0.0779 },
        ]
      : [
          { max: 17, c: 1.1369, m: 0.0598 },
          { max: 19, c: 1.1549, m: 0.0678 },
          { max: 29, c: 1.1599, m: 0.0717 },
          { max: 39, c: 1.1423, m: 0.0632 },
          { max: 49, c: 1.1333, m: 0.0612 },
          { max: Infinity, c: 1.1339, m: 0.0645 },
        ]
  const row = table.find((r) => ageYears <= r.max) ?? table[table.length - 1]!
  return row.c - row.m * Math.log10(sum)
}

/** Siri (1961): densidad → % de grasa. */
export function siriBodyFat(density: number): number {
  return (4.95 / density - 4.5) * 100
}

/** % grasa Durnin-Womersley + Siri. Null si faltan pliegues. */
export function bodyFatDurnin(skinfolds: Skinfolds, sex: Sex, ageYears: number): number | null {
  const d = durninWomersleyDensity(skinfolds, sex, ageYears)
  return d == null ? null : siriBodyFat(d)
}

/**
 * Faulkner (1968): % grasa = 0.153 × Σ4 + 5.783, con
 * tríceps + subescapular + supraespinal + abdominal. Muy usada en AR/deporte.
 */
export function bodyFatFaulkner(skinfolds: Skinfolds): number | null {
  const { triceps, subscapular, supraspinale, abdominal } = skinfolds
  if (triceps == null || subscapular == null || supraspinale == null || abdominal == null) return null
  const sum = triceps + subscapular + supraspinale + abdominal
  if (sum <= 0) return null
  return 0.153 * sum + 5.783
}

/** Masa grasa (kg) desde el % de grasa. */
export function fatMassKg(weightKg: number, bodyFatPct: number): number {
  return (weightKg * bodyFatPct) / 100
}

/** Masa magra / libre de grasa (kg). */
export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg - fatMassKg(weightKg, bodyFatPct)
}

// ---- Gasto energético ----

/** TMB por Mifflin-St Jeor (1990) — la más precisa para población general actual. */
export function bmrMifflin(weightKg: number, heightCm: number, ageYears: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  return sex === 'male' ? base + 5 : base - 161
}

/** TMB por Harris-Benedict revisada (Roza & Shizgal, 1984). */
export function bmrHarrisBenedict(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex,
): number {
  return sex === 'male'
    ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears
    : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears
}

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario',
  light: 'Actividad ligera (1-3 días/sem)',
  moderate: 'Actividad moderada (3-5 días/sem)',
  active: 'Activo (6-7 días/sem)',
  very_active: 'Muy activo (doble turno / físico)',
}

/** GET = TMB × factor de actividad. */
export function tdee(bmrValue: number, level: ActivityLevel): number {
  return bmrValue * ACTIVITY_FACTORS[level]
}

/** Edad en años cumplidos a una fecha (default hoy). */
export function ageAt(birthDate: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - birthDate.getFullYear()
  const m = at.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && at.getDate() < birthDate.getDate())) age--
  return age
}

// ---- Resumen derivado de un registro ----

export interface AnthropometryDerived {
  bmi: number | null
  bmiCategory: BmiCategory | null
  waistHipRatio: number | null
  waistHeightRatio: number | null
  bodyFatDurnin: number | null
  bodyFatFaulkner: number | null
  fatMassKg: number | null
  leanMassKg: number | null
  bmrMifflin: number | null
  bmrHarris: number | null
  tdee: number | null
}

export interface DerivedContext {
  sex?: Sex
  ageYears?: number
  activityLevel?: ActivityLevel
  /** Talla de respaldo (del member) si el registro no la trae. */
  fallbackHeightCm?: number
}

/** Calcula todos los derivados posibles con lo que haya; lo que falta queda null. */
export function deriveAnthropometry(
  record: Pick<AnthropometryRecord, 'weightKg' | 'heightCm' | 'perimeters' | 'skinfolds'>,
  ctx: DerivedContext,
): AnthropometryDerived {
  const heightCm = record.heightCm ?? ctx.fallbackHeightCm
  const theBmi = heightCm ? bmi(record.weightKg, heightCm) : null
  const durnin =
    record.skinfolds && ctx.sex && ctx.ageYears != null
      ? bodyFatDurnin(record.skinfolds, ctx.sex, ctx.ageYears)
      : null
  const faulkner = record.skinfolds ? bodyFatFaulkner(record.skinfolds) : null
  const fatPct = durnin ?? faulkner
  const mifflin =
    heightCm && ctx.sex && ctx.ageYears != null
      ? bmrMifflin(record.weightKg, heightCm, ctx.ageYears, ctx.sex)
      : null
  const harris =
    heightCm && ctx.sex && ctx.ageYears != null
      ? bmrHarrisBenedict(record.weightKg, heightCm, ctx.ageYears, ctx.sex)
      : null
  return {
    bmi: theBmi,
    bmiCategory: theBmi == null ? null : bmiCategory(theBmi),
    waistHipRatio: waistHipRatio(record.perimeters?.waist, record.perimeters?.hip),
    waistHeightRatio: waistHeightRatio(record.perimeters?.waist, heightCm),
    bodyFatDurnin: durnin,
    bodyFatFaulkner: faulkner,
    fatMassKg: fatPct == null ? null : fatMassKg(record.weightKg, fatPct),
    leanMassKg: fatPct == null ? null : leanMassKg(record.weightKg, fatPct),
    bmrMifflin: mifflin,
    bmrHarris: harris,
    tdee: mifflin != null && ctx.activityLevel ? tdee(mifflin, ctx.activityLevel) : null,
  }
}
