import type {
  AdminStats,
  AnthropometryRecord,
  Appointment,
  AppointmentStatus,
  AppointmentType,
  BlockedEmail,
  CheckIn,
  Clinic,
  ClinicPresentation,
  Food,
  MacrosPer100,
  MealDiaryEntry,
  MealPlan,
  MealPlanDay,
  MealPlanItem,
  MealPlanMeal,
  MealSlot,
  Member,
  Note,
  PatientPayment,
  Payment,
  SubscriptionPlan,
  Tariff,
  WeightLog,
} from '@/types'
import { DEFAULT_CLINIC_SETTINGS } from '@/types'
import { FOODS_SEED } from '@/data/foodsSeed'
import { addDays, lastNDayKeys, toDayKey, toWeekKey } from '@/utils/dateKeys'

/** Único consultorio de la demo. */
export const DEMO_CLINIC_ID = 'nutrivida'

/** Identidades que ofrece el DemoSwitcher / login demo. */
export const DEMO_IDENTITIES = {
  superadmin: {
    uid: 'demo-super',
    displayName: 'Rodrigo Frende',
    email: 'rodrigo@rf-nutri.app',
    photoURL: '',
  },
  admin: {
    uid: 'demo-admin',
    displayName: 'Valeria Sosa',
    email: 'valeria@rf-nutri.app',
    photoURL: '',
  },
  paciente: {
    uid: 'demo-paciente-camila',
    displayName: 'Camila Herrera',
    email: 'camila@rf-nutri.app',
    photoURL: '',
  },
} as const

const ADMIN_UID = DEMO_IDENTITIES.admin.uid

export interface DemoData {
  clinic: Clinic & { adminUids: string[] }
  members: Member[]
  tariffs: Tariff[]
  foods: Food[]
  mealPlans: MealPlan[]
  anthropometry: Record<string, AnthropometryRecord[]> // memberId -> mediciones
  diary: Record<string, MealDiaryEntry[]> // memberId -> diario alimentario
  weightLogs: Record<string, WeightLog[]> // memberId -> pesos autorreportados
  checkIns: Record<string, CheckIn[]> // memberId -> check-ins semanales
  appointments: Appointment[]
  patientPayments: PatientPayment[] // cobros de servicios a pacientes
  subscriptionPayments: Payment[] // cuotas SaaS del consultorio
  notes: Record<string, Note[]> // memberId -> notas clínicas
  plans: SubscriptionPlan[] // planes de suscripción (plataforma)
  presentation: ClinicPresentation // perfil público del consultorio
  blockedEmails: BlockedEmail[]
  stats: AdminStats
}

// ---------------------------------------------------------------------------
// Helpers de fechas relativas: TODO el seed se arma relativo a "hoy" para que
// la demo siempre se vea viva (turnos de esta semana, diario reciente, etc.).
// ---------------------------------------------------------------------------

/** Fecha a `daysFromNow` días de hoy, a una hora fija del día. */
function at(daysFromNow: number, hour: number, minute = 0): Date {
  const d = addDays(new Date(), daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return d
}

/** Hace `n` días, al mediodía (estable ante cambios de hora). */
const daysAgo = (n: number) => at(-n, 12)

// ---------------------------------------------------------------------------
// Alimentos y armado del plan alimentario
// ---------------------------------------------------------------------------

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Busca un alimento del catálogo seed por nombre (sin acentos ni mayúsculas). */
function findSeedFood(query: string) {
  const q = normalize(query)
  return FOODS_SEED.find((f) => normalize(f.name).includes(q))
}

/**
 * Ítem de plan con snapshot de macros. Si el alimento existe en FOODS_SEED se
 * referencia (foodId + per100 reales); si no, queda con el snapshot propio: el
 * cálculo de utils/nutrition funciona igual (usa grams + per100 del ítem).
 */
function foodItem(query: string, name: string, grams: number, per100: MacrosPer100): MealPlanItem {
  const food = findSeedFood(query)
  return {
    ...(food ? { foodId: food.id } : {}),
    name: food?.name ?? name,
    quantity: grams,
    unit: 'g',
    grams,
    per100: food?.per100 ?? per100,
  }
}

/** Macros por 100 g de respaldo (tabla argentina aproximada), por si el seed cambia. */
const PER100 = {
  avena: { kcal: 379, protein: 13.3, carbs: 67.7, fat: 6.5, fiber: 10.1 },
  yogurDescremado: { kcal: 45, protein: 4.3, carbs: 6.2, fat: 0.3 },
  banana: { kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
  manzana: { kcal: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4 },
  panIntegral: { kcal: 250, protein: 9.5, carbs: 44, fat: 3.5, fiber: 6 },
  quesoUntable: { kcal: 130, protein: 9, carbs: 4, fat: 8.5 },
  huevo: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
  pollo: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  carneMagra: { kcal: 137, protein: 21.5, carbs: 0, fat: 5.5 },
  merluza: { kcal: 82, protein: 17.8, carbs: 0, fat: 1.3 },
  arrozIntegral: { kcal: 124, protein: 2.6, carbs: 25.6, fat: 1, fiber: 1.6 },
  lentejas: { kcal: 116, protein: 9, carbs: 20.1, fat: 0.4, fiber: 7.9 },
  papa: { kcal: 87, protein: 1.9, carbs: 20.1, fat: 0.1, fiber: 1.8 },
  batata: { kcal: 90, protein: 2, carbs: 20.7, fat: 0.2, fiber: 3.3 },
  ensalada: { kcal: 20, protein: 1.2, carbs: 3.6, fat: 0.2, fiber: 1.5 },
  aceiteOliva: { kcal: 884, protein: 0, carbs: 0, fat: 100 },
  nueces: { kcal: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7 },
} satisfies Record<string, MacrosPer100>

function meal(slot: MealSlot, time: string, items: MealPlanItem[], notes?: string): MealPlanMeal {
  return { slot, time, items, ...(notes ? { notes } : {}) }
}

/** Clon profundo barato (los meals no tienen Dates) para no compartir referencias entre días. */
const cloneMeal = (m: MealPlanMeal): MealPlanMeal => JSON.parse(JSON.stringify(m)) as MealPlanMeal

// Variantes de comidas: el plan semanal se arma rotándolas, así el archivo no
// repite 7 días escritos a mano y el plan igual se ve variado.
const desayunos: MealPlanMeal[] = [
  meal('desayuno', '08:00', [
    foodItem('yogur bebible descremado', 'Yogur descremado', 200, PER100.yogurDescremado),
    foodItem('avena', 'Avena arrollada', 40, PER100.avena),
    foodItem('banana', 'Banana', 100, PER100.banana),
  ]),
  meal(
    'desayuno',
    '08:00',
    [
      foodItem('pan lactal integral', 'Pan integral', 60, PER100.panIntegral),
      foodItem('queso untable descremado', 'Queso untable descremado', 30, PER100.quesoUntable),
      foodItem('huevo', 'Huevo entero', 60, PER100.huevo),
    ],
    'Infusión sin azúcar a gusto',
  ),
]

const colacionesAm: MealPlanMeal[] = [
  meal('colacion_am', '11:00', [foodItem('manzana', 'Manzana', 150, PER100.manzana)]),
  meal('colacion_am', '11:00', [
    foodItem('yogur bebible descremado', 'Yogur descremado', 125, PER100.yogurDescremado),
    foodItem('nueces', 'Nueces', 15, PER100.nueces),
  ]),
]

const almuerzos: MealPlanMeal[] = [
  meal('almuerzo', '13:00', [
    foodItem('pechuga', 'Pechuga de pollo', 150, PER100.pollo),
    foodItem('arroz integral', 'Arroz integral cocido', 150, PER100.arrozIntegral),
    foodItem('ensalada', 'Ensalada de hojas verdes y tomate', 200, PER100.ensalada),
    foodItem('aceite de oliva', 'Aceite de oliva', 10, PER100.aceiteOliva),
  ]),
  meal('almuerzo', '13:00', [
    foodItem('merluza', 'Filet de merluza', 200, PER100.merluza),
    foodItem('papa', 'Papa hervida', 200, PER100.papa),
    foodItem('ensalada', 'Ensalada de zanahoria y huevo', 200, PER100.ensalada),
    foodItem('aceite de oliva', 'Aceite de oliva', 10, PER100.aceiteOliva),
  ]),
  meal(
    'almuerzo',
    '13:00',
    [
      foodItem('lentejas', 'Lentejas cocidas', 250, PER100.lentejas),
      foodItem('huevo', 'Huevo entero', 60, PER100.huevo),
      foodItem('ensalada', 'Ensalada de tomate y cebolla', 150, PER100.ensalada),
      foodItem('aceite de oliva', 'Aceite de oliva', 10, PER100.aceiteOliva),
    ],
    'Guiso liviano o ensalada de legumbres',
  ),
]

const meriendas: MealPlanMeal[] = [
  meal('merienda', '17:00', [
    foodItem('pan lactal integral', 'Pan integral', 50, PER100.panIntegral),
    foodItem('queso untable descremado', 'Queso untable descremado', 30, PER100.quesoUntable),
    foodItem('banana', 'Banana', 100, PER100.banana),
  ]),
  meal('merienda', '17:00', [
    foodItem('yogur bebible descremado', 'Yogur descremado', 200, PER100.yogurDescremado),
    foodItem('avena', 'Avena arrollada', 30, PER100.avena),
  ]),
]

const colacionesPm: MealPlanMeal[] = [
  meal('colacion_pm', '19:30', [foodItem('nueces', 'Nueces', 20, PER100.nueces)]),
]

const cenas: MealPlanMeal[] = [
  meal('cena', '21:00', [
    foodItem('nalga', 'Carne vacuna magra', 150, PER100.carneMagra),
    foodItem('batata', 'Batata al horno', 200, PER100.batata),
    foodItem('ensalada', 'Ensalada de rúcula y zanahoria', 200, PER100.ensalada),
    foodItem('aceite de oliva', 'Aceite de oliva', 10, PER100.aceiteOliva),
  ]),
  meal('cena', '21:00', [
    foodItem('pechuga', 'Pechuga de pollo', 150, PER100.pollo),
    foodItem('papa', 'Papa hervida', 150, PER100.papa),
    foodItem('ensalada', 'Verduras salteadas', 250, PER100.ensalada),
    foodItem('aceite de oliva', 'Aceite de oliva', 10, PER100.aceiteOliva),
  ]),
  meal('cena', '21:00', [
    foodItem('merluza', 'Filet de merluza', 200, PER100.merluza),
    foodItem('batata', 'Puré de batata', 200, PER100.batata),
    foodItem('ensalada', 'Ensalada de hojas verdes', 150, PER100.ensalada),
    foodItem('aceite de oliva', 'Aceite de oliva', 10, PER100.aceiteOliva),
  ]),
]

/** Semana completa rotando variantes (~1800 kcal/día). Colación PM día por medio. */
function buildWeekDays(): MealPlanDay[] {
  const labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  return labels.map((label, i) => ({
    label,
    meals: [
      cloneMeal(desayunos[i % desayunos.length]),
      cloneMeal(colacionesAm[i % colacionesAm.length]),
      cloneMeal(almuerzos[i % almuerzos.length]),
      cloneMeal(meriendas[i % meriendas.length]),
      ...(i % 2 === 0 ? [cloneMeal(colacionesPm[0])] : []),
      cloneMeal(cenas[i % cenas.length]),
    ],
  }))
}

/** Día tipo del template base (~1550 kcal). */
function buildDiaTipo(): MealPlanDay {
  return {
    label: 'Día tipo',
    meals: [
      cloneMeal(desayunos[0]),
      cloneMeal(colacionesAm[0]),
      cloneMeal(almuerzos[1]),
      cloneMeal(meriendas[1]),
      cloneMeal(cenas[2]),
    ],
  }
}

// ---------------------------------------------------------------------------
// Diario, peso y check-ins de Camila (paciente demo logueable)
// ---------------------------------------------------------------------------

/** Últimos 14 días de diario con adherencia creíble (patrón determinístico). */
function buildCamilaDiary(): MealDiaryEntry[] {
  const slots: MealSlot[] = ['desayuno', 'almuerzo', 'merienda', 'cena']
  const cycle: MealDiaryEntry['status'][] = [
    'done', 'done', 'done', 'partial', 'done', 'done', 'skipped', 'done', 'done', 'partial', 'done',
  ]
  const dayKeys = lastNDayKeys(14)
  const out: MealDiaryEntry[] = []
  dayKeys.forEach((dayKey, di) => {
    // El día de hoy queda "a medias": solo desayuno y almuerzo registrados.
    const daySlots = di === dayKeys.length - 1 ? slots.slice(0, 2) : slots
    daySlots.forEach((slot, si) => {
      const status = cycle[(di * slots.length + si) % cycle.length]
      out.push({
        id: `${dayKey}_${slot}`,
        dayKey,
        slot,
        status,
        ...(status === 'partial' ? { note: 'Comí parecido al plan, porción más chica' } : {}),
        ...(status === 'skipped' ? { note: 'Se me complicó por trabajo' } : {}),
        updatedAt: at(di - (dayKeys.length - 1), 21),
      })
    })
  })
  return out
}

/** ~10 pesos autorreportados cada 3 días, en línea con la antropometría (baja gradual). */
function buildCamilaWeightLogs(): WeightLog[] {
  const weights = [67.1, 66.9, 66.8, 66.5, 66.6, 66.3, 66.1, 66.2, 65.9, 65.8]
  return weights.map((weightKg, i) => {
    const date = at(-(weights.length - 1 - i) * 3, 8)
    const dayKey = toDayKey(date)
    return { id: dayKey, dayKey, weightKg, date }
  })
}

function checkIn(
  daysOffset: number,
  energy: number,
  sleep: number,
  hunger: number,
  adherence: number,
  comment: string,
): CheckIn {
  const date = at(daysOffset, 20)
  const weekKey = toWeekKey(date)
  return { id: weekKey, weekKey, energy, sleep, hunger, adherence, comment, date }
}

// ---------------------------------------------------------------------------
// Seed principal
// ---------------------------------------------------------------------------

/** Genera una copia fresca de la data inicial de NutriVida (todo en memoria). */
export function buildSeed(): DemoData {
  const clinic = {
    id: DEMO_CLINIC_ID,
    name: 'NutriVida',
    ownerUid: ADMIN_UID,
    adminUids: [ADMIN_UID],
    // Branding white-label de ejemplo: verde "salud" + fondo neutro claro.
    theme: {
      accent: '#059669',
      background: '#f6faf8',
      container: '#ffffff',
      text: '#0f172a',
    },
    // Suscripción del consultorio a la plataforma RF Nutri (plan Profesional, al día).
    subscription: {
      monthlyCost: 49999,
      planId: 'tier-profesional',
      startDate: daysAgo(140),
      lastPaymentDate: daysAgo(15),
      dueDate: at(15, 12),
      status: 'active' as const,
    },
    settings: DEFAULT_CLINIC_SETTINGS,
  }

  const members: Member[] = [
    {
      id: 'demo-admin',
      uid: ADMIN_UID,
      email: DEMO_IDENTITIES.admin.email,
      role: 'admin',
      fullName: 'Valeria Sosa',
      phone: '+54 11 5555-1000',
      birthDate: new Date('1990-04-12'),
      status: 'active',
      authStatus: 'active',
    },
    {
      // Paciente #1: la identidad "paciente" del DemoSwitcher (acceso reclamado).
      id: 'demo-paciente-camila',
      uid: DEMO_IDENTITIES.paciente.uid,
      email: DEMO_IDENTITIES.paciente.email,
      role: 'user',
      fullName: 'Camila Herrera',
      phone: '+54 11 5555-2001',
      birthDate: new Date('1992-06-15'),
      sex: 'female',
      heightCm: 165,
      goalType: 'lose_weight',
      goal: 'Bajar 5 kg para sentirme con más energía y mejorar los análisis',
      targetWeightKg: 62,
      targetKcal: 1800,
      activityLevel: 'light',
      medicalHistory: 'Hipotiroidismo subclínico en seguimiento endocrinológico. Sin cirugías.',
      allergies: 'Sin alergias alimentarias conocidas',
      intolerances: 'Lactosa (leve; tolera yogur y quesos duros)',
      medications: 'Levotiroxina 50 mcg en ayunas',
      habits:
        'Duerme 6-7 hs. Camina 30 min 3 veces por semana. Toma poca agua y 2 cafés por día. No fuma; alcohol social.',
      healthInsurance: { name: 'OSDE', plan: '210', memberNumber: '61234567-01' },
      startDate: daysAgo(110),
      status: 'active',
      authStatus: 'active',
    },
    {
      id: 'demo-paciente-marcos',
      uid: 'demo-paciente-marcos',
      email: 'marcos@rf-nutri.app',
      role: 'user',
      fullName: 'Marcos Gutiérrez',
      phone: '+54 11 5555-2002',
      birthDate: new Date('1996-11-03'),
      sex: 'male',
      heightCm: 178,
      goalType: 'gain_muscle',
      goal: 'Ganar masa muscular limpia para la próxima temporada',
      targetWeightKg: 82,
      targetKcal: 2800,
      activityLevel: 'active',
      medicalHistory: 'Sin antecedentes relevantes',
      allergies: 'Maní',
      habits: 'Musculación 4 veces por semana. Duerme 8 hs. Buena hidratación. No fuma.',
      healthInsurance: { name: 'Swiss Medical', plan: 'SMG20' },
      startDate: daysAgo(75),
      status: 'active',
      authStatus: 'active',
    },
    {
      id: 'demo-paciente-lucia',
      uid: 'demo-paciente-lucia',
      email: 'lucia@rf-nutri.app',
      role: 'user',
      fullName: 'Lucía Fernández',
      phone: '+54 11 5555-2003',
      birthDate: new Date('1978-02-21'),
      sex: 'female',
      heightCm: 160,
      goalType: 'health',
      goal: 'Ordenar la alimentación para mejorar la glucemia',
      activityLevel: 'sedentary',
      medicalHistory: 'Diabetes tipo 2 (2024). Hipertensión controlada.',
      medications: 'Metformina 850 mg · Enalapril 10 mg',
      habits: 'Trabajo de oficina, muchas horas sentada. Merienda con facturas casi a diario.',
      healthInsurance: { name: 'IOMA' },
      startDate: daysAgo(40),
      status: 'active',
      authStatus: 'active',
    },
    {
      // Invitación pendiente: sin uid hasta que reclame su acceso.
      id: 'demo-paciente-federico',
      uid: '',
      email: 'federico@rf-nutri.app',
      role: 'user',
      fullName: 'Federico Paz',
      phone: '+54 11 5555-2004',
      birthDate: new Date('2000-09-08'),
      sex: 'male',
      heightCm: 182,
      goalType: 'sport',
      goal: 'Optimizar composición corporal para competir en triatlón',
      activityLevel: 'very_active',
      habits: 'Entrena 6 veces por semana (natación, bici y running).',
      startDate: daysAgo(6),
      status: 'active',
      authStatus: 'pending_password',
    },
  ]

  const camila = members[1]
  const marcos = members[2]
  const lucia = members[3]
  const federico = members[4]

  // Tarifas de servicios del consultorio.
  const tariffs: Tariff[] = [
    {
      id: 'tf-primera',
      name: 'Primera consulta',
      kind: 'consulta',
      price: 25000,
      description: 'Anamnesis completa, objetivos y primeras pautas.',
      icon: 'star',
      active: true,
    },
    {
      id: 'tf-seguimiento',
      name: 'Consulta de seguimiento',
      kind: 'consulta',
      price: 18000,
      description: 'Control de progreso y ajustes del plan.',
      icon: 'calendar',
      active: true,
    },
    {
      id: 'tf-antropometria',
      name: 'Antropometría',
      kind: 'antropometria',
      price: 12000,
      description: 'Medición completa: peso, perímetros y pliegues.',
      icon: 'activity',
      active: true,
    },
    {
      id: 'tf-plan-mensual',
      name: 'Plan mensual',
      kind: 'tratamiento',
      price: 45000,
      description: 'Plan alimentario personalizado + seguimiento del mes.',
      icon: 'sparkles',
      active: true,
    },
  ]

  // Catálogo de alimentos: el seed base ya importado al consultorio demo.
  const foods: Food[] = FOODS_SEED.map((f) => ({
    ...f,
    source: 'seed' as const,
    active: true,
    createdBy: ADMIN_UID,
  }))

  const mealPlans: MealPlan[] = [
    {
      id: 'mp-template-1600',
      name: 'Plan base 1600 kcal',
      description: 'Template de descenso moderado para adaptar por paciente.',
      isTemplate: true,
      memberId: '',
      memberUid: '',
      status: 'draft',
      targetKcal: 1600,
      targetMacros: { proteinPct: 30, carbsPct: 40, fatPct: 30 },
      days: [buildDiaTipo()],
      generalNotes: 'Ajustar porciones según antropometría y nivel de actividad del paciente.',
      createdBy: ADMIN_UID,
      updatedAt: daysAgo(60),
    },
    {
      id: 'mp-camila-1800',
      name: 'Plan Camila — 1800 kcal',
      description: 'Descenso gradual con foco en adherencia y saciedad.',
      isTemplate: false,
      memberId: camila.id,
      memberUid: camila.uid,
      status: 'active',
      targetKcal: 1800,
      targetMacros: { proteinPct: 30, carbsPct: 40, fatPct: 30 },
      days: buildWeekDays(),
      generalNotes:
        'Tomar 2 litros de agua por día. Las verduras de almuerzos y cenas son libres. Endulzar con stevia si hace falta.',
      createdBy: ADMIN_UID,
      updatedAt: daysAgo(12),
    },
  ]

  // Antropometría: 3 mediciones de Camila en bajada + 1 de Marcos. Los 8
  // pliegues cargados → Durnin-Womersley y Faulkner calculan % de grasa.
  const anthropometry: Record<string, AnthropometryRecord[]> = {
    [camila.id]: [
      {
        id: 'anthro-cam-1',
        date: daysAgo(84),
        weightKg: 68.4,
        heightCm: 165,
        perimeters: { waist: 78, hip: 102, arm: 28.5, thigh: 57, calf: 36, neck: 32 },
        skinfolds: {
          triceps: 22, subscapular: 16, biceps: 11, iliacCrest: 19,
          supraspinale: 14, abdominal: 24, thigh: 28, calf: 17,
        },
        notes: 'Medición inicial',
        createdBy: ADMIN_UID,
      },
      {
        id: 'anthro-cam-2',
        date: daysAgo(42),
        weightKg: 66.9,
        heightCm: 165,
        perimeters: { waist: 76.5, hip: 100.5, arm: 28, thigh: 56, calf: 35.5, neck: 31.5 },
        skinfolds: {
          triceps: 20.5, subscapular: 15, biceps: 10, iliacCrest: 17.5,
          supraspinale: 13, abdominal: 22, thigh: 26.5, calf: 16,
        },
        createdBy: ADMIN_UID,
      },
      {
        id: 'anthro-cam-3',
        date: daysAgo(7),
        weightKg: 65.8,
        heightCm: 165,
        perimeters: { waist: 75, hip: 99.5, arm: 27.5, thigh: 55.5, calf: 35, neck: 31 },
        skinfolds: {
          triceps: 19, subscapular: 14, biceps: 9.5, iliacCrest: 16,
          supraspinale: 12, abdominal: 20.5, thigh: 25, calf: 15,
        },
        notes: 'Muy buena evolución: baja sostenida sin pérdida de perímetro de brazo.',
        createdBy: ADMIN_UID,
      },
    ],
    [marcos.id]: [
      {
        id: 'anthro-mar-1',
        date: daysAgo(30),
        weightKg: 78.2,
        heightCm: 178,
        perimeters: { waist: 82, hip: 96, arm: 34, thigh: 58, calf: 38, neck: 38 },
        skinfolds: {
          triceps: 9, subscapular: 10, biceps: 5, iliacCrest: 11,
          supraspinale: 8, abdominal: 14, thigh: 12, calf: 7,
        },
        notes: 'Punto de partida de la etapa de volumen.',
        createdBy: ADMIN_UID,
      },
    ],
  }

  const diary: Record<string, MealDiaryEntry[]> = {
    [camila.id]: buildCamilaDiary(),
  }

  const weightLogs: Record<string, WeightLog[]> = {
    [camila.id]: buildCamilaWeightLogs(),
  }

  const checkIns: Record<string, CheckIn[]> = {
    [camila.id]: [
      checkIn(-14, 6, 6, 7, 6, 'Semana complicada en el trabajo, me costó respetar las cenas.'),
      checkIn(-7, 7, 7, 5, 8, 'Mejor semana. Sumé las caminatas y llegué con menos hambre a la noche.'),
      checkIn(0, 8, 7, 4, 9, 'Muy encaminada, el plan me resulta fácil de sostener.'),
    ],
  }

  // Turnos relativos a hoy: agenda de hoy + esta semana + la próxima.
  const appointment = (
    id: string,
    member: Member,
    daysFromNow: number,
    hour: number,
    minute: number,
    durationMin: number,
    type: AppointmentType,
    status: AppointmentStatus,
    tariffId?: string,
    notes?: string,
  ): Appointment => {
    const startAt = at(daysFromNow, hour, minute)
    return {
      id,
      memberId: member.id,
      memberUid: member.uid,
      memberName: member.fullName,
      dayKey: toDayKey(startAt),
      startAt,
      durationMin,
      type,
      ...(tariffId ? { tariffId } : {}),
      status,
      ...(notes ? { notes } : {}),
      createdBy: ADMIN_UID,
      createdAt: daysAgo(10),
    }
  }

  const appointments: Appointment[] = [
    appointment('appt-0', camila, -7, 10, 0, 45, 'seguimiento', 'completed', 'tf-seguimiento'),
    appointment('appt-1', camila, 0, 10, 0, 45, 'seguimiento', 'confirmed', 'tf-seguimiento'),
    appointment('appt-2', marcos, 0, 11, 30, 30, 'antropometria', 'scheduled', 'tf-antropometria'),
    appointment('appt-3', lucia, 2, 9, 0, 45, 'seguimiento', 'scheduled', 'tf-seguimiento'),
    appointment(
      'appt-4', federico, 3, 16, 0, 60, 'primera_consulta', 'scheduled', 'tf-primera',
      'Derivado por su entrenador de triatlón',
    ),
    appointment('appt-5', camila, 8, 10, 0, 30, 'antropometria', 'scheduled', 'tf-antropometria'),
    appointment('appt-6', marcos, 9, 18, 0, 30, 'virtual', 'scheduled'),
  ]

  // Cobros a pacientes sobre los últimos ~4 meses (alimentan el gráfico de ingresos).
  const patientPayment = (
    id: string,
    member: Member,
    daysAgoN: number,
    tariff: Tariff,
  ): PatientPayment => ({
    id,
    memberId: member.id,
    memberUid: member.uid,
    memberName: member.fullName,
    serviceType: tariff.kind ?? 'otro',
    tariffId: tariff.id,
    amount: tariff.price,
    date: daysAgo(daysAgoN),
    createdBy: ADMIN_UID,
  })

  const [tfPrimera, tfSeguimiento, tfAntropometria, tfPlanMensual] = tariffs
  const patientPayments: PatientPayment[] = [
    patientPayment('pay-cam-1', camila, 110, tfPrimera),
    patientPayment('pay-cam-2', camila, 103, tfPlanMensual),
    patientPayment('pay-cam-3', camila, 72, tfPlanMensual),
    patientPayment('pay-cam-4', camila, 42, tfAntropometria),
    patientPayment('pay-cam-5', camila, 40, tfPlanMensual),
    patientPayment('pay-cam-6', camila, 7, tfSeguimiento),
    patientPayment('pay-mar-1', marcos, 75, tfPrimera),
    patientPayment('pay-mar-2', marcos, 68, tfPlanMensual),
    patientPayment('pay-mar-3', marcos, 35, tfPlanMensual),
    patientPayment('pay-mar-4', marcos, 12, tfSeguimiento),
    patientPayment('pay-luc-1', lucia, 38, tfPrimera),
  ]

  // Cuotas SaaS pagadas por el consultorio a la plataforma.
  const subscriptionPayments: Payment[] = [
    {
      id: 'subpay-1',
      amount: 49999,
      date: daysAgo(45),
      comment: 'Cuota mensual',
      createdBy: DEMO_IDENTITIES.superadmin.uid,
    },
    {
      id: 'subpay-2',
      amount: 49999,
      date: daysAgo(15),
      comment: 'Cuota mensual',
      createdBy: DEMO_IDENTITIES.superadmin.uid,
    },
  ]

  const notes: Record<string, Note[]> = {
    [camila.id]: [
      {
        id: 'note-cam-1',
        type: 'consultation',
        value:
          'Primera consulta: llega con cansancio y picoteo nocturno. Acordamos plan de 1800 kcal con 4 comidas + colaciones, prioridad en proteína y fibra.',
        date: daysAgo(110),
        createdBy: ADMIN_UID,
      },
      {
        id: 'note-cam-2',
        type: 'observation',
        value:
          'Baja sostenida de ~0.4 kg/semana sin caída de perímetro de brazo. Refiere mejor energía. Mantener plan y reevaluar pliegues el mes próximo.',
        date: daysAgo(7),
        createdBy: ADMIN_UID,
      },
    ],
  }

  // Planes de suscripción de la plataforma (lo que paga cada consultorio a RF Nutri).
  const plans: SubscriptionPlan[] = [
    {
      id: 'tier-inicial',
      name: 'Inicial',
      price: 24999,
      maxAdmins: 1,
      maxPatients: 20,
      maxMealPlans: 30,
      maxFoods: 300,
      diaryEnabled: false,
      maxDiaryPerPatient: 0,
      whiteLabel: 'none',
      features: [
        'Hasta 20 pacientes activos',
        'Ficha clínica y antropometría completa',
        '30 planes alimentarios y 300 alimentos propios',
        'Agenda de turnos y cobros de servicios',
        'Página pública de tu consultorio',
      ],
      active: true,
      customPricing: false,
      highlighted: false,
    },
    {
      id: 'tier-profesional',
      name: 'Profesional',
      price: 49999,
      maxAdmins: 2,
      maxPatients: 80,
      maxMealPlans: 200,
      maxFoods: 1000,
      diaryEnabled: true,
      maxDiaryPerPatient: 0,
      whiteLabel: 'basic',
      features: [
        'Hasta 80 pacientes y 2 profesionales',
        'Todo lo de Inicial',
        'Diario alimentario con fotos y check-ins semanales',
        'Registro de peso del paciente entre consultas',
        'Tu logo y tus colores en la app',
        'Dashboard con adherencia e ingresos',
      ],
      active: true,
      customPricing: false,
      highlighted: true,
    },
    {
      id: 'tier-a-medida',
      name: 'A medida',
      // El precio no se publica (customPricing) pero se conserva para el
      // orden por precio de listPlans.
      price: 80000,
      maxAdmins: 0,
      maxPatients: 0,
      maxMealPlans: 0,
      maxFoods: 0,
      diaryEnabled: true,
      maxDiaryPerPatient: 0,
      whiteLabel: 'full',
      features: [
        'Pacientes, profesionales y planes sin límite',
        'Todo lo de Profesional, sin topes',
        'White-label completo con tu marca',
        'Soporte prioritario y onboarding asistido',
        'Precio que acompaña el tamaño de tu consultorio',
      ],
      active: true,
      customPricing: true,
      highlighted: false,
    },
  ]

  // Perfil público del consultorio (visible sin login).
  const presentation: ClinicPresentation = {
    id: DEMO_CLINIC_ID,
    name: clinic.name,
    theme: clinic.theme,
    description:
      'Consultorio de nutrición en Caballito. Planes alimentarios personalizados, antropometría y seguimiento cercano, con foco en hábitos sostenibles. Atención presencial y virtual.',
    links: [
      { label: 'Instagram', url: 'https://instagram.com/nutrivida.ba' },
      { label: 'Sacá tu turno online', url: 'https://example.com/turnos' },
    ],
    tariffs: tariffs.slice(0, 3).map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      description: t.description,
      icon: t.icon,
    })),
    whatsapp: '+54 9 11 5555-0101',
    email: 'hola@nutrivida.com.ar',
    address: 'Av. Rivadavia 4820, CABA',
    openingHours: 'Lun a Vie 9 a 18 hs',
  }

  // En demo no hay rules: la lista sirve para probar la PANTALLA de vetados.
  const blockedEmails: BlockedEmail[] = []

  const now = new Date()
  const stats: AdminStats = {
    patientCount: members.filter((m) => m.role === 'user').length,
    monthlyRevenue: patientPayments
      .filter((p) => {
        const d = p.date as Date
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, p) => sum + p.amount, 0),
    plansSent: mealPlans.filter((p) => !p.isTemplate && p.status === 'active').length,
    updatedAt: new Date(),
  }

  return {
    clinic,
    members,
    tariffs,
    foods,
    mealPlans,
    anthropometry,
    diary,
    weightLogs,
    checkIns,
    appointments,
    patientPayments,
    subscriptionPayments,
    notes,
    plans,
    presentation,
    blockedEmails,
    stats,
  }
}
