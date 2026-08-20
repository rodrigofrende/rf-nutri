import type { SubscriptionPlan, WhiteLabelLevel } from '@/types'

/** "Ilimitado" si el límite es 0, sino el número. */
export function limitLabel(n: number): string {
  return n > 0 ? String(n) : 'Ilimitado'
}

const WHITE_LABEL_LABELS: Record<WhiteLabelLevel, string> = {
  none: 'Sin white-label',
  basic: 'White-label (logo + colores)',
  full: 'White-label completo',
}

export function whiteLabelLabel(level: WhiteLabelLevel): string {
  return WHITE_LABEL_LABELS[level]
}

export interface ClinicUsage {
  patients: number
  admins: number
  mealPlans: number
  foods: number
}

/** ¿El uso supera algún límite del plan? (0 = ilimitado, nunca excede). */
export function exceedsLimit(usage: ClinicUsage, plan: SubscriptionPlan | undefined): boolean {
  if (!plan) return false
  const over = (used: number, max: number) => max > 0 && used > max
  return (
    over(usage.patients, plan.maxPatients) ||
    over(usage.admins, plan.maxAdmins) ||
    over(usage.mealPlans, plan.maxMealPlans) ||
    over(usage.foods, plan.maxFoods)
  )
}

export function canCreatePatient(
  plan: SubscriptionPlan | undefined,
  currentCount: number,
): { allowed: boolean; reason?: string } {
  if (!plan || plan.maxPatients === 0 || currentCount < plan.maxPatients) return { allowed: true }
  return {
    allowed: false,
    reason: `Alcanzaste el límite de pacientes de tu plan (${plan.maxPatients}).`,
  }
}

export function canCreateMealPlan(
  plan: SubscriptionPlan | undefined,
  currentCount: number,
): { allowed: boolean; reason?: string } {
  if (!plan || plan.maxMealPlans === 0 || currentCount < plan.maxMealPlans) return { allowed: true }
  return {
    allowed: false,
    reason: `Alcanzaste el límite de planes alimentarios de tu plan (${plan.maxMealPlans}).`,
  }
}

export function canCreateFood(
  plan: SubscriptionPlan | undefined,
  currentCount: number,
): { allowed: boolean; reason?: string } {
  if (!plan || plan.maxFoods === 0 || currentCount < plan.maxFoods) return { allowed: true }
  return {
    allowed: false,
    reason: `Alcanzaste el límite de alimentos de tu plan (${plan.maxFoods}).`,
  }
}

export function canCreateAdmin(
  plan: SubscriptionPlan | undefined,
  currentCount: number,
): { allowed: boolean; reason?: string } {
  if (!plan || plan.maxAdmins === 0 || currentCount < plan.maxAdmins) return { allowed: true }
  return {
    allowed: false,
    reason: `Alcanzaste el límite de administradores de tu plan (${plan.maxAdmins}).`,
  }
}

/** "12/40" o "12/∞" si el límite es ilimitado. */
export function usageLabel(used: number, max: number): string {
  return `${used}/${max > 0 ? max : '∞'}`
}

/** Texto de la capacidad de diario/check-ins del plan. */
export function diaryCapabilityLabel(plan: SubscriptionPlan): string {
  if (!plan.diaryEnabled) return 'Sin diario del paciente'
  return plan.maxDiaryPerPatient > 0
    ? `${plan.maxDiaryPerPatient} registros/paciente`
    : 'Diario ilimitado'
}

/**
 * ¿Puede el paciente registrar en el diario según el plan del consultorio?
 * Sin plan → permitido. `diaryEnabled=false` → bloqueado. Tope alcanzado → bloqueado.
 */
export function canPatientLogDiary(
  plan: SubscriptionPlan | undefined,
  currentCount: number,
): { allowed: boolean; reason?: string } {
  if (!plan) return { allowed: true }
  if (!plan.diaryEnabled) {
    return { allowed: false, reason: 'El plan del consultorio no incluye el diario.' }
  }
  if (plan.maxDiaryPerPatient > 0 && currentCount >= plan.maxDiaryPerPatient) {
    return {
      allowed: false,
      reason: `Alcanzaste el límite de registros de tu plan (${plan.maxDiaryPerPatient}).`,
    }
  }
  return { allowed: true }
}
