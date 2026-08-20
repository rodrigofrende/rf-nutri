import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'user'

export type MemberStatus = 'active' | 'paused'

export type MemberAuthStatus = 'pending_password' | 'active' | 'password_change_required'

export type DateValue = Timestamp | Date | null

/** Perfil global mínimo del usuario (colección `users`). */
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
}

/**
 * Paleta white-label de un consultorio. Solo 3 colores de marca; los grises/neutrales
 * de la app quedan constantes (texto, bordes) para legibilidad garantizada.
 */
export interface ClinicTheme {
  accent: string // hex ancla → genera la escala brand-50..900
  background: string // fondo de página (surface-muted)
  container: string // superficie de cards/modales (surface)
  text: string // color de texto principal (foreground fuerte)
}

/** Nivel de white-label de un plan de suscripción. */
export type WhiteLabelLevel = 'none' | 'basic' | 'full'

/** Plan de suscripción de la plataforma (colección top-level `plans`). */
export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  maxAdmins: number // 0 = ilimitado
  maxPatients: number // 0 = ilimitado
  maxMealPlans: number // 0 = ilimitado
  maxFoods: number // 0 = ilimitado
  diaryEnabled: boolean // si los pacientes pueden registrar diario/check-ins
  maxDiaryPerPatient: number // 0 = ilimitado (solo si diaryEnabled)
  whiteLabel: WhiteLabelLevel
  features?: string[]
  active: boolean
  customPricing?: boolean // precio a convenir: la landing muestra "A medida" en vez del precio
  highlighted?: boolean // plan destacado ("Recomendado") en la landing pública
}

/** Suscripción del consultorio a la plataforma RF Nutri (lo gestiona el super-admin). */
export interface ClinicSubscription {
  monthlyCost: number
  planId?: string // plan de suscripción asignado
  startDate?: DateValue // fecha de ingreso a la plataforma
  lastPaymentDate?: DateValue
  dueDate?: DateValue // próximo vencimiento estipulado
  status: 'active' | 'suspended'
}

/** Unidades preferidas para mostrar cantidades de alimentos. */
export type PreferredUnits = 'grams' | 'household' | 'both'

/** Fórmulas de % de grasa disponibles. */
export type BodyFatFormula = 'durnin' | 'faulkner'

/**
 * Configuración de trabajo del consultorio. La app trae todas las opciones y el
 * admin elige con cuáles trabajar. Enforcement client-side (solo afecta UI):
 * las rules no cambian, `settings` entra en el update admin del doc de clinic.
 */
export interface ClinicSettings {
  showCalories: boolean // mostrar kcal en planes y vistas del paciente
  showMacros: boolean // mostrar desglose prot/carbs/grasas
  preferredUnits: PreferredUnits // priorizar gramos, medidas caseras o ambas
  diaryPhotosEnabled: boolean // permitir fotos en el diario del paciente
  anthropometry: {
    perimeters: boolean // sección de perímetros
    skinfolds: boolean // sección de pliegues
    bodyFatFormulas: BodyFatFormula[] // fórmulas de % grasa a mostrar
    showBmi: boolean // IMC y categoría
    showEnergy: boolean // TMB / GET
  }
}

export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  showCalories: true,
  showMacros: true,
  preferredUnits: 'both',
  diaryPhotosEnabled: true,
  anthropometry: {
    perimeters: true,
    skinfolds: true,
    bodyFatFormulas: ['durnin', 'faulkner'],
    showBmi: true,
    showEnergy: true,
  },
}

/** Consultorio / tenant (colección `clinics`). */
export interface Clinic {
  id: string
  name: string
  logoURL?: string
  // Ventana de rate-limit de cambios de logo (máx. 3 por 24hs, validado en firestore.rules)
  logoWindowStart?: DateValue
  logoChangeCount?: number
  ownerUid: string
  adminUids?: string[] // uids con permisos de admin (fuente de verdad en las rules)
  theme?: ClinicTheme
  subscription?: ClinicSubscription
  settings?: ClinicSettings
}

/** Enlace personalizado de la presentación (título + URL). */
export interface ClinicLink {
  label: string
  url: string
}

/**
 * Snapshot público de una tarifa para mostrar en la presentación. Se copia desde
 * `clinics/{clinicId}/tariffs` al guardar (la subcolección real es privada). Solo campos
 * pensados para mostrar a prospectos.
 */
export interface PublicTariff {
  id: string // referencia a la tarifa original (para re-seleccionar en el editor)
  name: string
  price: number
  description?: string
  icon?: TariffIconKey
}

/**
 * Presentación pública del consultorio (`publicProfiles/{clinicId}`). Documento legible
 * SIN login (rules: `allow read: if true`), por eso NO contiene datos sensibles: solo
 * lo que el consultorio quiere mostrar a prospectos + un snapshot de marca
 * (name/logoURL/theme) para renderizar branded sin leer el doc protegido `clinics/{clinicId}`.
 */
export interface ClinicPresentation {
  id: string // = clinicId
  // Snapshot de marca (se refresca al guardar)
  name: string
  logoURL?: string
  theme?: ClinicTheme
  // Contenido editable por el admin
  description?: string
  videos?: string[] // URLs de YouTube/Instagram, en orden
  links?: ClinicLink[] // enlaces personalizados (incluye redes), en orden
  tariffs?: PublicTariff[] // tarifas que el admin elige mostrar (snapshot)
  // Contacto
  whatsapp?: string // número crudo; se normaliza a dígitos para wa.me
  email?: string
  address?: string
  openingHours?: string
  updatedAt?: DateValue
}

/** Sexo biológico del paciente (requerido por las fórmulas antropométricas). */
export type Sex = 'female' | 'male'

/** Objetivo principal del tratamiento. */
export type GoalType = 'lose_weight' | 'gain_muscle' | 'maintain' | 'health' | 'sport' | 'other'

/** Nivel de actividad física → factor del GET (1.2–1.9). */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

/** Obra social / cobertura del paciente. */
export interface HealthInsurance {
  name: string
  plan?: string
  memberNumber?: string
}

/**
 * Membresía de un usuario en un consultorio (`clinics/{clinicId}/members/{memberId}`).
 * Aloja pacientes Y admins (nutricionistas), igual que en RF-FIT.
 * `id` es el id del doc (identificador canónico dentro del consultorio).
 * `uid` enlaza con la cuenta de Firebase Auth; queda vacío hasta que el paciente
 * "reclama" su acceso al loguearse con el email con el que lo dieron de alta.
 */
export interface Member {
  id: string
  uid: string // '' = invitación pendiente de reclamar
  email: string
  loginEmail?: string
  authStatus?: MemberAuthStatus
  passwordUpdatedAt?: DateValue
  passwordResetRequestedAt?: DateValue
  role: Role
  // datos personales (editables por user y admin)
  fullName: string
  phone?: string
  birthDate?: DateValue
  photoURL?: string
  // ficha clínica (solo admin escribe; el paciente la lee)
  sex?: Sex // requerido para Durnin-Womersley / Mifflin
  heightCm?: number // talla base (también se registra por medición)
  goalType?: GoalType
  goal?: string // objetivo en palabras del paciente
  targetWeightKg?: number
  targetKcal?: number // meta calórica para el plan
  activityLevel?: ActivityLevel
  medicalHistory?: string // antecedentes / patologías
  allergies?: string
  intolerances?: string
  medications?: string
  habits?: string // sueño, alcohol, tabaco, agua, actividad, preferencias
  healthInsurance?: HealthInsurance
  // datos de negocio (solo admin)
  startDate?: DateValue
  status: MemberStatus
}

/** Alias semántico: en RF-NUTRI el member con role 'user' es un paciente. */
export type Patient = Member

/**
 * Índice público de lookup exacto para login de pacientes (`memberLoginIndex/{emailKey}`).
 * Es world-readable (el login lo lee antes de autenticar), así que NO guarda PII de
 * más: sin nombre completo ni rol, solo lo mínimo para rutear y reclamar el acceso.
 */
export interface MemberLoginIndex {
  id: string
  email: string
  clinicId: string
  clinicName: string
  memberId: string
  // Nota: NO se guarda authStatus acá. El índice es world-readable (el login lo
  // lee antes de autenticar) y exponer "pending_password" delataba qué pacientes
  // están sin reclamar. El estado se resuelve tras autenticar, leyendo el member.
}

/**
 * Email vetado por el super-admin (`blockedEmails/{emailKey}`, top-level).
 *
 * A diferencia de `MemberLoginIndex`, este doc NO es world-readable: sólo lo lee
 * el super-admin. Las rules igual pueden consultarlo (leen con privilegios
 * propios), así que el veto se hace cumplir sin exponer la lista ni el `reason`.
 */
export interface BlockedEmail {
  id: string // = emailKey = email normalizado
  email: string // debe coincidir con el id (lo validan las rules)
  /** Nota interna del super-admin. Nunca se le muestra al usuario vetado. */
  reason?: string
  createdAt: DateValue
}

/** Tipo de servicio que ofrece el consultorio. */
export type TariffKind = 'consulta' | 'tratamiento' | 'antropometria' | 'otro'

/** Tarifa / servicio que ofrece el consultorio (`clinics/{clinicId}/tariffs`). */
export interface Tariff {
  id: string
  name: string
  price: number
  kind?: TariffKind
  description?: string
  icon?: TariffIconKey
  active: boolean
}

/**
 * Cobro de un servicio a un paciente (`clinics/{clinicId}/payments`).
 * Colección per-clinic (no subcolección por member) para que el historial
 * general del admin sea una sola query. El paciente lee los propios
 * (where memberUid == uid; la regla lo garantiza).
 */
export interface PatientPayment {
  id: string
  memberId: string
  memberUid: string // '' si el paciente aún no reclamó su acceso
  memberName: string // snapshot para el historial
  serviceType: TariffKind
  tariffId?: string // tarifa usada para pre-cargar el monto (referencia)
  amount: number
  date: DateValue
  comment?: string
  createdBy: string
}

/** Pago de la cuota SaaS del consultorio (`clinics/{clinicId}/subscriptionPayments`). */
export interface Payment {
  id: string
  amount: number
  date: DateValue
  comment?: string // nota opcional del pago
  createdBy: string
}

/** Membresía resumida para el selector de tenant. */
export interface Membership {
  clinicId: string
  memberId: string
  clinicName: string
  clinicLogoURL?: string
  clinicTheme?: ClinicTheme
  role: Role
}

export type NoteType = 'consultation' | 'lab' | 'observation'

/** Nota clínica privada del admin (`.../members/{memberId}/notes`). El paciente no la ve. */
export interface Note {
  id: string
  type: NoteType
  value: string
  date: DateValue
  createdBy: string
}

/** Icono visual de la tarifa (cards y formulario). */
export type TariffIconKey =
  | 'membership'
  | 'dumbbell'
  | 'activity'
  | 'heart'
  | 'users'
  | 'calendar'
  | 'star'
  | 'crown'
  | 'zap'
  | 'sparkles'

// ---------------------------------------------------------------------------
// Alimentos y planes alimentarios
// ---------------------------------------------------------------------------

export type FoodCategory =
  | 'cereales_legumbres'
  | 'panificados'
  | 'frutas'
  | 'verduras'
  | 'carnes_pescados'
  | 'huevos'
  | 'lacteos'
  | 'grasas_aceites'
  | 'bebidas'
  | 'dulces_snacks'
  | 'preparaciones'
  | 'suplementos'
  | 'otros'

/** Macros por 100 g / 100 ml del alimento. */
export interface MacrosPer100 {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

/** Medida casera: "1 taza" → 200 g. */
export interface HouseholdMeasure {
  name: string
  grams: number
}

/**
 * Alimento del catálogo del consultorio (`clinics/{clinicId}/foods/{foodId}`).
 * El seed inicial usa ids determinísticos `seed-<slug>` → import idempotente.
 */
export interface Food {
  id: string
  name: string
  category: FoodCategory
  per100: MacrosPer100
  measures?: HouseholdMeasure[]
  source?: 'seed' | 'custom'
  active: boolean
  createdBy: string
}

/** Momento de comida del día (6 slots fijos). */
export type MealSlot = 'desayuno' | 'colacion_am' | 'almuerzo' | 'merienda' | 'colacion_pm' | 'cena'

export type MealPlanStatus = 'draft' | 'active' | 'archived'

/** Ítem de una comida: alimento del catálogo o texto libre. */
export interface MealPlanItem {
  foodId?: string // ausente/'' = texto libre
  name: string // snapshot (sobrevive edits/deletes del catálogo)
  quantity: number
  unit: string // 'g' | 'ml' | 'unidad' | nombre de medida casera
  grams?: number // gramos resueltos para el cálculo; undefined = sin macros
  per100?: MacrosPer100 // snapshot al agregar → render sin N lecturas
  notes?: string
}

export interface MealPlanMeal {
  slot: MealSlot
  time?: string // hora sugerida, ej. "08:00"
  items: MealPlanItem[]
  notes?: string
}

export interface MealPlanDay {
  label: string // 'Día tipo' | 'Lunes'…
  meals: MealPlanMeal[]
  notes?: string
}

/**
 * Plan alimentario (`clinics/{clinicId}/mealPlans/{planId}`). Días/comidas/ítems
 * embebidos (peor caso ~160 KB << 1 MB). Topes en cliente: ≤7 días, ≤6 comidas/día,
 * ≤20 ítems/comida. PROHIBIDO guardar imágenes acá.
 * Los templates llevan `isTemplate: true` y `memberUid: ''` → invisibles al paciente
 * por rules (solo lee docs con su propio memberUid).
 */
export interface MealPlan {
  id: string
  name: string
  description?: string
  isTemplate: boolean
  memberId: string // '' en templates
  memberUid: string // '' en templates o pacientes sin reclamar
  status: MealPlanStatus // 'active' = plan vigente del paciente
  targetKcal?: number
  targetMacros?: { proteinPct: number; carbsPct: number; fatPct: number }
  days: MealPlanDay[]
  generalNotes?: string // indicaciones generales
  createdBy: string
  updatedAt?: DateValue
}

// ---------------------------------------------------------------------------
// Antropometría
// ---------------------------------------------------------------------------

/** Perímetros corporales (cm). */
export interface Perimeters {
  waist?: number
  hip?: number
  arm?: number
  thigh?: number
  calf?: number
  neck?: number
}

/** Pliegues cutáneos (mm). Durnin-Womersley usa 4; Faulkner usa 4. */
export interface Skinfolds {
  triceps?: number
  subscapular?: number
  biceps?: number
  iliacCrest?: number
  supraspinale?: number
  abdominal?: number
  thigh?: number
  calf?: number
}

/**
 * Medición antropométrica (`.../members/{memberId}/anthropometry/{recordId}`).
 * SOLO valores crudos: IMC, % grasa, masa magra, ICC, TMB y GET se derivan
 * client-side en utils/anthropometry.ts (con sex/birthDate/activityLevel del member).
 */
export interface AnthropometryRecord {
  id: string
  date: DateValue
  weightKg: number
  heightCm?: number
  perimeters?: Perimeters
  skinfolds?: Skinfolds
  notes?: string
  createdBy: string
}

// ---------------------------------------------------------------------------
// Diario, peso y check-ins del paciente
// ---------------------------------------------------------------------------

/** Adherencia de una comida del diario. */
export type MealAdherence = 'done' | 'partial' | 'skipped'

/**
 * Entrada del diario alimentario (`.../members/{memberId}/diary/{dayKey_slot}`).
 * Id determinístico → 1 doc por comida por día. Es el ÚNICO lugar de la app
 * donde el paciente sube fotos (data:image ≤150 KB, validado en rules).
 */
export interface MealDiaryEntry {
  id: string // `${dayKey}_${slot}`
  dayKey: string // 'YYYY-MM-DD'
  slot: MealSlot
  status: MealAdherence
  note?: string // ≤500
  photoURL?: string // data:image ≤150 KB
  updatedAt?: DateValue
}

/** Peso autorreportado (`.../members/{memberId}/weightLogs/{dayKey}`). 1 por día. */
export interface WeightLog {
  id: string // = dayKey
  dayKey: string
  weightKg: number
  note?: string
  date: DateValue
}

/** Check-in semanal (`.../members/{memberId}/checkIns/{weekKey}`). 1 por semana. */
export interface CheckIn {
  id: string // = weekKey 'YYYY-Www'
  weekKey: string
  energy: number // 1-10
  sleep: number // 1-10
  hunger: number // 1-10
  adherence: number // 1-10
  comment?: string // ≤1000
  date: DateValue
}

// ---------------------------------------------------------------------------
// Turnos
// ---------------------------------------------------------------------------

export type AppointmentType = 'primera_consulta' | 'seguimiento' | 'antropometria' | 'virtual' | 'otro'

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

/**
 * Turno (`clinics/{clinicId}/appointments/{appointmentId}`, auto-id: un paciente
 * puede tener más de un turno por día). Vistas día/semana consultan por rango de
 * `startAt`; `dayKey` agrupa client-side.
 */
export interface Appointment {
  id: string
  memberId: string
  memberUid: string // '' si el paciente aún no reclamó
  memberName: string // snapshot para la agenda
  dayKey: string // 'YYYY-MM-DD'
  startAt: DateValue
  durationMin: number
  type: AppointmentType
  tariffId?: string
  status: AppointmentStatus
  notes?: string // nota del admin
  createdBy: string
  createdAt?: DateValue
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** Doc agregado para el panel admin (`clinics/{clinicId}/stats/summary`). */
export interface AdminStats {
  patientCount: number
  monthlyRevenue: number
  plansSent: number
  updatedAt?: DateValue
}

export interface SeriesPoint {
  label: string
  value: number
}

/** Datos derivados para el panel del admin (KPIs + series para gráficos). */
export interface ClinicDashboard {
  pacientesActivos: number
  pacientesTotal: number
  cobradoEsteMes: number
  turnosHoy: number
  turnosSemana: number
  planesActivos: number
  adherenciaMedia: number // % de comidas 'done' del diario, últimos 7 días
  revenueByMonth: SeriesPoint[] // últimos 6 meses ($ cobrado)
  altasByMonth: SeriesPoint[] // últimos 6 meses (altas)
  adherenceByWeek: SeriesPoint[] // últimas ~8 semanas (% adherencia)
  statusBreakdown: { key: string; label: string; value: number }[]
}
