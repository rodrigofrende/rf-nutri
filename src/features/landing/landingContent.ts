import {
  Apple,
  BarChart3,
  Banknote,
  CalendarCheck,
  Camera,
  ClipboardList,
  HeartPulse,
  Mail,
  Rocket,
  Ruler,
  Smartphone,
  Stethoscope,
  TrendingUp,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { SubscriptionPlan } from '@/types'
import { APP_NAME } from '@/config/app'

/**
 * Contenido de la landing pública de RF NUTRI (copy es-AR). Separado de la vista
 * para que ajustar textos no toque markup.
 */

export interface LandingFeature {
  icon: LucideIcon
  title: string
  body: string
}

export interface LandingFeatureGroup {
  eyebrow: string
  features: LandingFeature[]
}

export const FEATURE_GROUPS: LandingFeatureGroup[] = [
  {
    eyebrow: 'Para vos, en el día a día',
    features: [
      {
        icon: Users,
        title: 'Cada paciente, con su ficha',
        body: 'Historia clínica, objetivos, antecedentes y notas de cada consulta en un solo lugar. Llegás a cada turno sabiendo exactamente dónde quedaron.',
      },
      {
        icon: CalendarCheck,
        title: 'Agenda que se maneja sola',
        body: 'Turnos con confirmación y tu semana visible de un vistazo. Menos huecos por olvidos, más consultas que suceden.',
      },
      {
        icon: Banknote,
        title: 'Cobros sin vueltas',
        body: 'Registrás cada consulta cobrada y ves quién debe qué. Vos cobrás como siempre; acá queda todo anotado y ordenado.',
      },
      {
        icon: BarChart3,
        title: 'Tu consultorio en números',
        body: 'Consultas, ingresos, pacientes activos y evolución mes a mes en un dashboard claro. Decisiones con datos, no con sensaciones.',
      },
    ],
  },
  {
    eyebrow: 'Para tu consulta',
    features: [
      {
        icon: UtensilsCrossed,
        title: 'Planes con macros en vivo',
        body: 'Armás el plan y las kcal, proteínas, carbos y grasas se recalculan solas mientras editás. El plan cierra antes de enviarlo.',
      },
      {
        icon: Apple,
        title: 'Alimentos de acá',
        body: 'Base de más de 200 alimentos argentinos lista para usar, y podés cargar los tuyos con sus medidas caseras.',
      },
      {
        icon: Ruler,
        title: 'Antropometría de verdad',
        body: 'Pliegues con Durnin-Womersley y Faulkner, TMB y GET calculados al toque. Cargás las medidas y la evaluación sale sola.',
      },
      {
        icon: ClipboardList,
        title: 'Plantillas que ahorran horas',
        body: 'Guardá tus planes tipo y adaptalos en minutos. Cada consulta nueva arranca desde tu experiencia, no desde cero.',
      },
    ],
  },
  {
    eyebrow: 'Para tus pacientes',
    features: [
      {
        icon: Smartphone,
        title: 'Su plan en el bolsillo',
        body: 'Cada paciente ve su plan del día en el celular, claro y ordenado. Se acabaron los PDFs perdidos en el chat.',
      },
      {
        icon: Camera,
        title: 'Diario de comidas con fotos',
        body: 'Sacan una foto de lo que comieron y vos lo ves desde tu panel. La próxima consulta arranca con datos reales, no con memoria.',
      },
      {
        icon: HeartPulse,
        title: 'Check-in semanal',
        body: 'Energía, hambre y adherencia en tres toques por semana. Detectás a tiempo cuándo un plan necesita ajuste.',
      },
      {
        icon: TrendingUp,
        title: 'Su evolución en gráficos',
        body: 'Peso, medidas y progreso en curvas que se entienden. Ver el propio avance es la mejor razón para volver.',
      },
    ],
  },
]

export interface LandingStep {
  icon: LucideIcon
  title: string
  body: string
}

export const STEPS: LandingStep[] = [
  {
    icon: Mail,
    title: 'Escribinos',
    body: 'Nos contás cómo atendés, por email o WhatsApp. Sin formularios eternos ni demos interminables: la app es simple e intuitiva y arrancás enseguida.',
  },
  {
    icon: Rocket,
    title: 'Activamos tu consultorio',
    body: 'Creamos tu espacio con tu marca y la base de alimentos ya cargada. Vos sumás tus plantillas, tus tarifas y tu agenda en minutos.',
  },
  {
    icon: Stethoscope,
    title: 'Atendés con todo en un lugar',
    body: 'Ficha, antropometría, plan y cobros en la misma pantalla. Tus pacientes salen de la consulta con su plan en el celular.',
  },
]

// Chips del hero enfocados en el beneficio para la nutricionista. Se eligen para
// NO repetir lo que ya dice el aside "Info rápida" (100% web, precios, planes desde).
export const TRUTHS = [
  'Planes con macros en vivo',
  'Tus pacientes con su propia app',
  'Hecho para consultorios de acá',
]

export interface LandingFaq {
  q: string
  a: string
}

export const FAQS: LandingFaq[] = [
  {
    q: '¿Necesito instalar algo?',
    a: `No. ${APP_NAME} es 100% web: funciona en el celular, la tablet y la compu, sin descargar nada. Tus pacientes tampoco instalan nada.`,
  },
  {
    q: '¿Mis pacientes pagan por usar la app?',
    a: 'No. La app de tus pacientes entra en tu plan: acceden gratis con su email, cada uno con su propia cuenta, su plan y su diario.',
  },
  {
    q: '¿Mis datos y los de mis pacientes están seguros?',
    a: 'Sí. Cada consultorio vive aislado del resto: nadie de otro consultorio puede ver tu información, y a la tuya solo se entra con tu cuenta. Cada paciente ve únicamente lo suyo.',
  },
  {
    q: '¿Puedo usar mis propios alimentos y medidas caseras?',
    a: 'Sí. Arrancás con una base de más de 200 alimentos argentinos y podés cargar los tuyos, con medidas caseras —taza, cucharada, unidad— para que el plan se entienda sin balanza.',
  },
  {
    q: '¿Qué pasa si me quiero ir?',
    a: 'Nada raro: no hay permanencia ni letra chica. Usás la plataforma mes a mes y la dejás cuando quieras. Preferimos que te quedes porque te sirve, no por un contrato.',
  },
  {
    q: '¿Cómo arranco?',
    a: 'Escribinos por email o WhatsApp contándonos cómo atendés. Activamos tu consultorio, te damos tu usuario y ese mismo día ya podés cargar tu primer paciente.',
  },
]

/**
 * Asuntos pre-armados por contexto: el mail entra a la casilla ya clasificado,
 * sin que el prospecto tenga que explicar de dónde salió. Usan `APP_NAME` en vez
 * de "RF NUTRI" escrito a mano, que estaría duplicado en cuatro lugares.
 */
export const EMAIL_GENERAL_SUBJECT = `Quiero ${APP_NAME} en mi consultorio`
export const EMAIL_PLAN_HELP_SUBJECT = `No sé qué plan de ${APP_NAME} va con mi consultorio`
export function emailPlanSubject(plan: SubscriptionPlan): string {
  if (plan.customPricing) return `Consulta por el plan ${plan.name} de ${APP_NAME}`
  return `Me interesa el plan ${plan.name} de ${APP_NAME}`
}

/** Mensaje pre-armado para el CTA de WhatsApp de la landing. */
export const WHATSAPP_GENERAL_MESSAGE = `Hola, quiero ${APP_NAME} en mi consultorio. ¿Me contás cómo arranco?`

/** Etiqueta del CTA según el rol del plan en la escalera de precios. */
export function planCtaLabel(plan: SubscriptionPlan): string {
  if (plan.customPricing) return 'Hablemos'
  if (plan.highlighted) return 'Quiero este plan'
  return 'Probalo'
}

/**
 * Snapshot estático de los tiers para cuando el fetch falla o la colección está
 * vacía: la sección de planes nunca queda en blanco frente a un prospecto.
 * Mantener alineado con el seed / los planes reales de /super/plans.
 */
export const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 'fallback-inicial',
    name: 'Primeras consultas',
    price: 29999,
    maxAdmins: 1,
    maxPatients: 30,
    maxMealPlans: 60,
    maxFoods: 100,
    diaryEnabled: true,
    maxDiaryPerPatient: 0,
    whiteLabel: 'none',
    features: [
      'Hasta 30 pacientes activos',
      'Planes alimentarios con kcal y macros en vivo',
      'Base de +200 alimentos argentinos, más 100 tuyos',
      'Antropometría: Durnin-Womersley, Faulkner, TMB y GET',
      'Agenda de turnos y cobros por consulta',
      'App para tus pacientes con diario de comidas',
    ],
    active: true,
    customPricing: false,
    highlighted: false,
  },
  {
    id: 'fallback-pro',
    name: 'Consultorio',
    price: 54999,
    maxAdmins: 3,
    maxPatients: 0,
    maxMealPlans: 0,
    maxFoods: 0,
    diaryEnabled: true,
    maxDiaryPerPatient: 0,
    whiteLabel: 'basic',
    features: [
      'Pacientes y planes alimentarios sin límite',
      'Todo lo de Primeras consultas',
      'Tu logo y tus colores en la app',
      'Plantillas para no arrancar cada plan de cero',
      'Alimentos propios ilimitados',
      'Check-in semanal y evolución en gráficos',
      'Estadísticas completas de tu consultorio',
      'Hasta 3 usuarios para tu equipo',
    ],
    active: true,
    customPricing: false,
    highlighted: true,
  },
  {
    id: 'fallback-premium',
    name: 'Equipo',
    price: 99999,
    maxAdmins: 0,
    maxPatients: 0,
    maxMealPlans: 0,
    maxFoods: 0,
    diaryEnabled: true,
    maxDiaryPerPatient: 0,
    whiteLabel: 'full',
    features: [
      'Todo lo de Consultorio, sin topes',
      'Nutricionistas y administradores sin límite',
      'White-label completo: la app es tuya',
      'Onboarding asistido para todo el equipo',
      'Soporte prioritario',
      'Precio que acompaña el tamaño de tu equipo',
    ],
    active: true,
    customPricing: true,
    highlighted: false,
  },
]

/** Planes a mostrar: los reales (activos) o el fallback estático. */
export function resolveLandingPlans(
  plans: SubscriptionPlan[] | undefined,
  isError: boolean,
): SubscriptionPlan[] {
  const active = (plans ?? []).filter((p) => p.active)
  if (isError || active.length === 0) return FALLBACK_PLANS
  return active
}
