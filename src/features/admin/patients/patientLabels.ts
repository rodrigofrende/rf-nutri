import type { GoalType, Sex } from '@/types'

/**
 * Labels de la ficha clínica compartidos por la lista, el formulario y el
 * detalle del paciente. Viven acá (y no en utils) porque son copy propio de
 * las vistas de admin de pacientes, no vocabulario global de la app.
 */

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  lose_weight: 'Bajar de peso',
  gain_muscle: 'Ganar masa muscular',
  maintain: 'Mantenimiento',
  health: 'Salud',
  sport: 'Rendimiento deportivo',
  other: 'Otro',
}

export const SEX_LABELS: Record<Sex, string> = {
  female: 'Femenino',
  male: 'Masculino',
}
