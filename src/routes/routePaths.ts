import type { Role } from '@/types'

export const ROUTES = {
  LOGIN: '/login',
  SET_PASSWORD: '/set-password',
  // Página propia (branded) para las acciones de email de Firebase (reset de
  // contraseña). Firebase apunta acá cuando se setea el "custom action URL".
  AUTH_ACTION: '/auth/action',
  SELECT_CLINIC: '/select-clinic',

  // Presentación pública del consultorio (sin login, compartible con prospectos)
  PUBLIC_CLINIC: '/n/:clinicId',

  // Super-admin (global, cross-tenant) — plataforma RF NUTRI
  SUPER_DASHBOARD: '/super',
  SUPER_CLINICS: '/super/clinics',
  SUPER_PLANS: '/super/plans',
  SUPER_BLOCKED: '/super/emails-vetados',

  // Admin (nutricionista)
  ADMIN_DASHBOARD: '/admin',
  ADMIN_PATIENTS: '/admin/patients',
  ADMIN_PATIENT_DETAIL: '/admin/patients/:memberId',
  ADMIN_MEAL_PLANS: '/admin/meal-plans',
  ADMIN_MEAL_PLAN_NEW: '/admin/meal-plans/new',
  ADMIN_MEAL_PLAN_DETAIL: '/admin/meal-plans/:planId',
  ADMIN_FOODS: '/admin/foods',
  ADMIN_AGENDA: '/admin/agenda',
  ADMIN_PAYMENTS: '/admin/payments',
  ADMIN_TARIFFS: '/admin/tariffs',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_BRANDING: '/admin/branding',
  ADMIN_MY_CLINIC: '/admin/my-clinic',

  // Paciente
  APP_PLAN: '/app/plan',
  APP_DIARY: '/app/diary',
  APP_CHECK_IN: '/app/check-in',
  APP_PROGRESS: '/app/progress',
  APP_APPOINTMENTS: '/app/turnos',
  APP_PAYMENTS: '/app/pagos',
  APP_PROFILE: '/app/profile',
  APP_MY_CLINIC: '/app/my-clinic',
} as const

export const adminPatientDetail = (memberId: string) => `/admin/patients/${memberId}`
export const adminMealPlanDetail = (planId: string) => `/admin/meal-plans/${planId}`
export const publicClinicRoute = (clinicId: string) => `/n/${clinicId}`

/** Home por defecto según rol (Panel al final del menú: carga pesada). */
export function defaultHomeForRole(
  role: Role | null,
  options?: { isSuperAdmin?: boolean },
): string {
  if (options?.isSuperAdmin) return ROUTES.SUPER_CLINICS
  switch (role) {
    case 'admin':
      return ROUTES.ADMIN_PATIENTS
    case 'user':
      return ROUTES.APP_PLAN
    default:
      return ROUTES.SELECT_CLINIC
  }
}
