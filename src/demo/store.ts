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
  ClinicSubscription,
  Food,
  MealDiaryEntry,
  MealPlan,
  MealSlot,
  Member,
  MemberAuthStatus,
  MemberLoginIndex,
  Membership,
  Note,
  PatientPayment,
  Payment,
  SubscriptionPlan,
  Tariff,
  TariffKind,
  WeightLog,
} from '@/types'
import { buildSeed, DEMO_CLINIC_ID } from './seed'
import { FOODS_SEED } from '@/data/foodsSeed'
import { addMonths } from '@/utils/payments'
import { toDate } from '@/utils/format'
import { monthKey } from '@/utils/dates'
import { addDays, toDayKey } from '@/utils/dateKeys'
import { buildDashboard } from '@/utils/dashboard'
import { loginEmailKeys, normalizeEmailKey } from '@/utils/loginEmail'

// Inputs espejo de los services (definidos acá para no importar de services,
// que importan este módulo — sería un ciclo).
interface NewPaymentInput {
  amount: number
  date: Date
  comment?: string
  createdBy: string
}

interface NewPatientPaymentInput {
  memberId: string
  memberUid: string
  memberName: string
  serviceType: TariffKind
  tariffId?: string
  amount: number
  date: Date
  comment?: string
  createdBy: string
}

interface NewAppointmentInput {
  memberId: string
  memberUid: string
  memberName: string
  startAt: Date
  durationMin: number
  type: AppointmentType
  tariffId?: string
  status?: AppointmentStatus
  notes?: string
  createdBy: string
}

type NewAnthropometryInput = Omit<AnthropometryRecord, 'id' | 'date'> & { date: Date }

interface DiaryEntryInput {
  dayKey: string
  slot: MealSlot
  status: MealDiaryEntry['status']
  note?: string
  photoURL?: string
}

interface WeightLogInput {
  dayKey: string
  weightKg: number
  note?: string
}

interface CheckInInput {
  weekKey: string
  energy: number
  sleep: number
  hunger: number
  adherence: number
  comment?: string
}

/**
 * Store en memoria para el modo demo. Singleton a nivel módulo: las ediciones
 * persisten durante la sesión y se resetean al recargar la página (re-import).
 */
const data = buildSeed()

// Lista de clinics en memoria. El primero es NutriVida (data.clinic, misma referencia),
// para que las ediciones del seed y de acá queden sincronizadas.
type DemoClinic = Clinic & { adminUids: string[] }
const clinics: DemoClinic[] = [data.clinic]

// Cuotas SaaS por clinic (la demo trae solo NutriVida, pero el super-admin puede crear más).
const subscriptionPayments: Record<string, Payment[]> = {
  [DEMO_CLINIC_ID]: data.subscriptionPayments,
}
const memberLoginIndex: Record<string, MemberLoginIndex> = buildMemberLoginIndex()

let counter = 0
const nextId = (prefix: string) => `${prefix}-${++counter}-demo`

const ok = <T>(value: T) => Promise.resolve(value)

const byDateDesc = <T extends { date: unknown }>(list: T[]) =>
  [...list].sort((a, b) => +new Date(b.date as Date) - +new Date(a.date as Date))

function loginIndexForMember(member: Member, email = member.loginEmail || member.email): MemberLoginIndex {
  const key = normalizeEmailKey(email)
  return {
    id: key,
    email: key,
    clinicId: DEMO_CLINIC_ID,
    clinicName: data.clinic.name,
    memberId: member.id,
  }
}

function buildMemberLoginIndex(): Record<string, MemberLoginIndex> {
  const out: Record<string, MemberLoginIndex> = {}
  for (const member of data.members) {
    for (const key of loginEmailKeys(member)) {
      out[key] = loginIndexForMember(member, key)
    }
  }
  return out
}

// ---- Clinic (tenant) ----
const findClinic = (clinicId: string) => clinics.find((c) => c.id === clinicId)

export function listClinics() {
  return ok(clinics.map((c) => ({ ...c })) as Clinic[])
}
export function getClinic(clinicId: string) {
  const c = findClinic(clinicId) ?? clinics[0]
  return ok({ ...c } as Clinic)
}
export function createClinic(payload: Omit<Clinic, 'id'>) {
  const id = nextId('clinic')
  clinics.push({ adminUids: [], ...payload, id })
  return ok(id)
}
export function removeClinic(clinicId: string) {
  const i = clinics.findIndex((c) => c.id === clinicId)
  if (i > 0) clinics.splice(i, 1) // nunca borrar NutriVida (índice 0) en demo
  return ok(undefined)
}
export function updateClinic(clinicId: string, payload: Partial<Clinic>) {
  const c = findClinic(clinicId)
  if (c) Object.assign(c, payload)
  return ok(undefined)
}
export function clearClinicLogo(clinicId: string) {
  const c = findClinic(clinicId)
  if (c) delete c.logoURL
  return ok(undefined)
}
export function addClinicAdmin(clinicId: string, uid: string) {
  const c = findClinic(clinicId)
  if (c && !c.adminUids.includes(uid)) c.adminUids.push(uid)
  return ok(undefined)
}
export function removeClinicAdmin(clinicId: string, uid: string) {
  const c = findClinic(clinicId)
  if (c) c.adminUids = c.adminUids.filter((u) => u !== uid)
  return ok(undefined)
}

// ---- Perfil público (presentación) ----
const publicProfiles: Record<string, ClinicPresentation> = {
  [DEMO_CLINIC_ID]: data.presentation,
}

export function getClinicPresentation(clinicId: string) {
  return ok((publicProfiles[clinicId] ?? null) as ClinicPresentation | null)
}
export function listClinicPresentations() {
  return ok(Object.values(publicProfiles).map((p) => ({ ...p })))
}
export function updateClinicPresentation(clinicId: string, payload: Partial<ClinicPresentation>) {
  publicProfiles[clinicId] = {
    ...(publicProfiles[clinicId] ?? ({ id: clinicId, name: data.clinic.name } as ClinicPresentation)),
    ...payload,
    id: clinicId,
    updatedAt: new Date(),
  }
  return ok(undefined)
}
export function clearClinicPresentationLogo(clinicId: string) {
  const profile = publicProfiles[clinicId]
  if (profile) delete profile.logoURL
  return ok(undefined)
}

// ---- Planes de suscripción (plataforma) ----
export function listPlans() {
  return ok([...data.plans])
}
export function createPlan(payload: Omit<SubscriptionPlan, 'id'>) {
  const id = nextId('plan')
  data.plans.push({ ...payload, id })
  return ok(id)
}
export function updatePlan(planId: string, payload: Partial<SubscriptionPlan>) {
  const p = data.plans.find((x) => x.id === planId)
  if (p) Object.assign(p, payload)
  return ok(undefined)
}
export function removePlan(planId: string) {
  data.plans = data.plans.filter((p) => p.id !== planId)
  return ok(undefined)
}

// ---- Emails vetados (plataforma) ----
// En demo no hay rules, así que esto sirve para probar la PANTALLA, no el
// bloqueo: acá vetar un email no impide nada. El veto real lo hace cumplir
// firestore.rules (isBlockedEmail), y eso sólo se prueba con el emulador.
const blockedEmails: BlockedEmail[] = [...data.blockedEmails]

export function listBlockedEmails() {
  return ok([...blockedEmails])
}
export function blockEmail(emailKey: string, reason?: string) {
  if (!blockedEmails.some((b) => b.id === emailKey)) {
    blockedEmails.unshift({ id: emailKey, email: emailKey, reason, createdAt: new Date() })
  }
  // Mismo efecto que en Firestore: se le saca el índice de login.
  delete memberLoginIndex[emailKey]
  return ok(undefined)
}
export function unblockEmail(emailKey: string) {
  const i = blockedEmails.findIndex((b) => b.id === emailKey)
  if (i >= 0) blockedEmails.splice(i, 1)
  return ok(undefined)
}

// ---- Tarifas ----
export function listTariffs(_clinicId: string) {
  return ok([...data.tariffs])
}
export function createTariff(_clinicId: string, payload: Omit<Tariff, 'id'>) {
  const id = nextId('tf')
  data.tariffs.push({ ...payload, id })
  return ok(id)
}
export function updateTariff(_clinicId: string, tariffId: string, payload: Partial<Tariff>) {
  const t = data.tariffs.find((x) => x.id === tariffId)
  if (t) Object.assign(t, payload)
  return ok(undefined)
}
export function removeTariff(_clinicId: string, tariffId: string) {
  data.tariffs = data.tariffs.filter((t) => t.id !== tariffId)
  return ok(undefined)
}

// ---- Members ----
export function listMembers(_clinicId: string) {
  return ok([...data.members])
}
export function getMember(_clinicId: string, memberId: string) {
  return ok(data.members.find((m) => m.id === memberId) ?? null)
}
export function createMember(_clinicId: string, payload: Omit<Member, 'id' | 'uid'>) {
  const id = nextId('member')
  const member = {
    ...payload,
    id,
    uid: '',
    loginEmail: payload.loginEmail || payload.email,
    authStatus: payload.authStatus ?? 'pending_password',
  } satisfies Member
  data.members.push(member)
  syncMemberLoginIndex(DEMO_CLINIC_ID, id, member)
  return ok(id)
}
export function updateMember(_clinicId: string, memberId: string, payload: Partial<Member>) {
  const m = data.members.find((x) => x.id === memberId)
  if (m) {
    const oldEmail = m.loginEmail || m.email
    Object.assign(m, payload)
    if ((m.loginEmail || m.email) !== oldEmail) removeMemberLoginIndex(oldEmail)
    syncMemberLoginIndex(DEMO_CLINIC_ID, memberId, m)
  }
  return ok(undefined)
}
export function updateMemberProfile(
  clinicId: string,
  memberId: string,
  payload: Partial<Member>,
) {
  return updateMember(clinicId, memberId, payload)
}
export function removeMember(_clinicId: string, memberId: string) {
  const prev = data.members.find((m) => m.id === memberId)
  if (prev) removeMemberLoginIndex(prev.loginEmail || prev.email)
  data.members = data.members.filter((m) => m.id !== memberId)
  return ok(undefined)
}

export function getMemberLogin(email: string) {
  return ok(memberLoginIndex[normalizeEmailKey(email)] ?? null)
}

export function syncMemberLoginIndex(_clinicId: string, memberId: string, memberInput: Omit<Member, 'id'> | Member) {
  const member = 'id' in memberInput ? memberInput : ({ ...memberInput, id: memberId } as Member)
  for (const key of loginEmailKeys(member)) {
    memberLoginIndex[key] = loginIndexForMember(member, key)
  }
  return ok(undefined)
}

export function removeMemberLoginIndex(email: string) {
  delete memberLoginIndex[normalizeEmailKey(email)]
  return ok(undefined)
}

export function updateMemberAuthStatus(
  clinicId: string,
  memberId: string,
  authStatus: MemberAuthStatus,
  extra: Partial<Pick<Member, 'passwordUpdatedAt' | 'passwordResetRequestedAt'>> = {},
) {
  return updateMember(clinicId, memberId, { authStatus, ...extra })
}

// ---- Alimentos ----
export function listFoods(_clinicId: string) {
  return ok([...data.foods].sort((a, b) => a.name.localeCompare(b.name)))
}
export function createFood(_clinicId: string, payload: Omit<Food, 'id'>) {
  const id = nextId('food')
  data.foods.push({ ...payload, id })
  return ok(id)
}
export function updateFood(_clinicId: string, foodId: string, payload: Partial<Omit<Food, 'id'>>) {
  const f = data.foods.find((x) => x.id === foodId)
  if (f) Object.assign(f, payload)
  return ok(undefined)
}
export function removeFood(_clinicId: string, foodId: string) {
  data.foods = data.foods.filter((f) => f.id !== foodId)
  return ok(undefined)
}
/** Importa los alimentos del seed que falten (idempotente). Devuelve cuántos agregó. */
export function importSeedFoods(_clinicId: string, createdBy: string) {
  const existing = new Set(data.foods.map((f) => f.id))
  const pending = FOODS_SEED.filter((f) => !existing.has(f.id))
  for (const seed of pending) {
    data.foods.push({ ...seed, source: 'seed', active: true, createdBy })
  }
  return ok(pending.length)
}

// ---- Planes alimentarios ----
export function listMealPlans(_clinicId: string) {
  return ok([...data.mealPlans].sort((a, b) => a.name.localeCompare(b.name)))
}
export function getMealPlan(_clinicId: string, planId: string) {
  return ok(data.mealPlans.find((p) => p.id === planId) ?? null)
}
export function listPlansForMember(_clinicId: string, memberUid: string) {
  return ok(data.mealPlans.filter((p) => p.memberUid === memberUid))
}
export function createMealPlan(_clinicId: string, payload: Omit<MealPlan, 'id'>) {
  const id = nextId('mp')
  data.mealPlans.push({ ...payload, id, updatedAt: new Date() })
  return ok(id)
}
export function updateMealPlan(_clinicId: string, planId: string, payload: Partial<Omit<MealPlan, 'id'>>) {
  const p = data.mealPlans.find((x) => x.id === planId)
  if (p) Object.assign(p, payload, { updatedAt: new Date() })
  return ok(undefined)
}
export function removeMealPlan(_clinicId: string, planId: string) {
  data.mealPlans = data.mealPlans.filter((p) => p.id !== planId)
  return ok(undefined)
}
/**
 * Asigna un plan a un paciente y lo activa: archiva cualquier otro plan activo
 * del paciente (misma semántica atómica que el batch de producción).
 */
export function assignPlanToPatient(_clinicId: string, planId: string, member: Pick<Member, 'id' | 'uid'>) {
  const plan = data.mealPlans.find((p) => p.id === planId)
  if (!plan) return Promise.reject(new Error('No encontramos el plan alimentario'))
  for (const other of data.mealPlans) {
    if (other.id !== planId && other.memberId === member.id && other.status === 'active') {
      other.status = 'archived'
    }
  }
  Object.assign(plan, {
    memberId: member.id,
    memberUid: member.uid,
    isTemplate: false,
    status: 'active' as const,
    updatedAt: new Date(),
  })
  return ok(undefined)
}

// ---- Antropometría ----
export function listAnthropometry(_clinicId: string, memberId: string) {
  return ok(byDateDesc(data.anthropometry[memberId] ?? []))
}
export function createAnthropometryRecord(_clinicId: string, memberId: string, payload: NewAnthropometryInput) {
  const id = nextId('anthro')
  data.anthropometry[memberId] = [...(data.anthropometry[memberId] ?? []), { ...payload, id }]
  return ok(id)
}
export function updateAnthropometryRecord(
  _clinicId: string,
  memberId: string,
  recordId: string,
  payload: Partial<NewAnthropometryInput>,
) {
  data.anthropometry[memberId] = (data.anthropometry[memberId] ?? []).map((r) =>
    r.id === recordId ? { ...r, ...payload, id: recordId } : r,
  )
  return ok(undefined)
}
export function removeAnthropometryRecord(_clinicId: string, memberId: string, recordId: string) {
  data.anthropometry[memberId] = (data.anthropometry[memberId] ?? []).filter((r) => r.id !== recordId)
  return ok(undefined)
}

// ---- Diario alimentario ----
export function listDiaryEntries(_clinicId: string, memberId: string, fromKey: string, toKey: string) {
  return ok(
    (data.diary[memberId] ?? [])
      .filter((e) => e.dayKey >= fromKey && e.dayKey <= toKey)
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
      .map((e) => ({ ...e })),
  )
}
/** Upsert por id determinístico `${dayKey}_${slot}` (1 doc por comida por día). */
export function saveDiaryEntry(_clinicId: string, memberId: string, entry: DiaryEntryInput) {
  const id = `${entry.dayKey}_${entry.slot}`
  const next: MealDiaryEntry = {
    id,
    dayKey: entry.dayKey,
    slot: entry.slot,
    status: entry.status,
    ...(entry.note ? { note: entry.note } : {}),
    ...(entry.photoURL ? { photoURL: entry.photoURL } : {}),
    updatedAt: new Date(),
  }
  const list = data.diary[memberId] ?? []
  data.diary[memberId] = list.some((e) => e.id === id)
    ? list.map((e) => (e.id === id ? next : e))
    : [...list, next]
  return ok(id)
}
export function removeDiaryEntry(_clinicId: string, memberId: string, entryId: string) {
  data.diary[memberId] = (data.diary[memberId] ?? []).filter((e) => e.id !== entryId)
  return ok(undefined)
}

// ---- Peso autorreportado ----
export function listWeightLogs(_clinicId: string, memberId: string) {
  return ok([...(data.weightLogs[memberId] ?? [])].sort((a, b) => a.dayKey.localeCompare(b.dayKey)))
}
/** Upsert por dayKey (1 registro por día). */
export function saveWeightLog(_clinicId: string, memberId: string, input: WeightLogInput) {
  const next: WeightLog = {
    id: input.dayKey,
    dayKey: input.dayKey,
    weightKg: input.weightKg,
    ...(input.note ? { note: input.note } : {}),
    date: new Date(),
  }
  const list = data.weightLogs[memberId] ?? []
  data.weightLogs[memberId] = list.some((w) => w.id === next.id)
    ? list.map((w) => (w.id === next.id ? next : w))
    : [...list, next]
  return ok(next.id)
}
export function removeWeightLog(_clinicId: string, memberId: string, dayKey: string) {
  data.weightLogs[memberId] = (data.weightLogs[memberId] ?? []).filter((w) => w.id !== dayKey)
  return ok(undefined)
}

// ---- Check-ins semanales ----
export function listCheckIns(_clinicId: string, memberId: string) {
  return ok([...(data.checkIns[memberId] ?? [])].sort((a, b) => b.weekKey.localeCompare(a.weekKey)))
}
/** Upsert por weekKey (1 check-in por semana ISO). */
export function saveCheckIn(_clinicId: string, memberId: string, input: CheckInInput) {
  const next: CheckIn = {
    id: input.weekKey,
    weekKey: input.weekKey,
    energy: input.energy,
    sleep: input.sleep,
    hunger: input.hunger,
    adherence: input.adherence,
    ...(input.comment ? { comment: input.comment } : {}),
    date: new Date(),
  }
  const list = data.checkIns[memberId] ?? []
  data.checkIns[memberId] = list.some((c) => c.id === next.id)
    ? list.map((c) => (c.id === next.id ? next : c))
    : [...list, next]
  return ok(next.id)
}
export function removeCheckIn(_clinicId: string, memberId: string, weekKey: string) {
  data.checkIns[memberId] = (data.checkIns[memberId] ?? []).filter((c) => c.id !== weekKey)
  return ok(undefined)
}

// ---- Turnos ----
const byStartAsc = (list: Appointment[]) =>
  [...list].sort((a, b) => +new Date(a.startAt as Date) - +new Date(b.startAt as Date))

/** Turnos con startAt en [from, to), ascendentes. */
export function listAppointmentsByRange(_clinicId: string, from: Date, to: Date) {
  return ok(
    byStartAsc(
      data.appointments.filter((a) => {
        const start = toDate(a.startAt)
        return start ? start >= from && start < to : false
      }),
    ).map((a) => ({ ...a })),
  )
}
export function listAppointmentsForMember(_clinicId: string, memberUid: string) {
  return ok(byStartAsc(data.appointments.filter((a) => a.memberUid === memberUid)).map((a) => ({ ...a })))
}
export function listAppointmentsByMemberId(_clinicId: string, memberId: string) {
  return ok(byStartAsc(data.appointments.filter((a) => a.memberId === memberId)).map((a) => ({ ...a })))
}
export function createAppointment(_clinicId: string, payload: NewAppointmentInput) {
  const id = nextId('appt')
  data.appointments.push({
    id,
    memberId: payload.memberId,
    memberUid: payload.memberUid,
    memberName: payload.memberName,
    dayKey: toDayKey(payload.startAt),
    startAt: payload.startAt,
    durationMin: payload.durationMin,
    type: payload.type,
    ...(payload.tariffId ? { tariffId: payload.tariffId } : {}),
    status: payload.status ?? 'scheduled',
    ...(payload.notes ? { notes: payload.notes } : {}),
    createdBy: payload.createdBy,
    createdAt: new Date(),
  })
  return ok(id)
}
export function updateAppointment(
  _clinicId: string,
  appointmentId: string,
  payload: Partial<Omit<NewAppointmentInput, 'createdBy'>>,
) {
  const a = data.appointments.find((x) => x.id === appointmentId)
  if (a) {
    const { startAt, ...rest } = payload
    Object.assign(a, rest)
    if (startAt) {
      a.startAt = startAt
      a.dayKey = toDayKey(startAt)
    }
  }
  return ok(undefined)
}
export function setAppointmentStatus(_clinicId: string, appointmentId: string, status: AppointmentStatus) {
  const a = data.appointments.find((x) => x.id === appointmentId)
  if (a) a.status = status
  return ok(undefined)
}
export function removeAppointment(_clinicId: string, appointmentId: string) {
  data.appointments = data.appointments.filter((a) => a.id !== appointmentId)
  return ok(undefined)
}

// ---- Notas clínicas (solo admin) ----
export function listNotes(_clinicId: string, memberId: string) {
  return ok(byDateDesc(data.notes[memberId] ?? []))
}
export function createNote(_clinicId: string, memberId: string, payload: Omit<Note, 'id'>) {
  const id = nextId('note')
  data.notes[memberId] = [...(data.notes[memberId] ?? []), { ...payload, id }]
  return ok(id)
}
export function removeNote(_clinicId: string, memberId: string, noteId: string) {
  data.notes[memberId] = (data.notes[memberId] ?? []).filter((n) => n.id !== noteId)
  return ok(undefined)
}

// ---- Cobros a pacientes ----
export function listPayments(_clinicId: string) {
  return ok(byDateDesc(data.patientPayments))
}
export function listPaymentsForMember(_clinicId: string, memberId: string) {
  return ok(byDateDesc(data.patientPayments.filter((p) => p.memberId === memberId)))
}
export function listMyPayments(_clinicId: string, memberUid: string) {
  return ok(byDateDesc(data.patientPayments.filter((p) => p.memberUid === memberUid)))
}
export function recordPayment(_clinicId: string, p: NewPatientPaymentInput) {
  const id = nextId('pay')
  const payment: PatientPayment = {
    id,
    memberId: p.memberId,
    memberUid: p.memberUid,
    memberName: p.memberName,
    serviceType: p.serviceType,
    ...(p.tariffId ? { tariffId: p.tariffId } : {}),
    amount: p.amount,
    date: p.date,
    comment: p.comment ?? '',
    createdBy: p.createdBy,
  }
  data.patientPayments.push(payment)
  return ok(id)
}
export function removePayment(_clinicId: string, paymentId: string) {
  data.patientPayments = data.patientPayments.filter((p) => p.id !== paymentId)
  return ok(undefined)
}

// ---- Cuotas SaaS del consultorio (super-admin) ----
export function listSubscriptionPayments(clinicId: string) {
  return ok(byDateDesc(subscriptionPayments[clinicId] ?? []))
}
export function registerSubscriptionPayment(clinicId: string, p: NewPaymentInput, sub: ClinicSubscription) {
  const id = nextId('subpay')
  const payment: Payment = {
    id,
    amount: p.amount,
    date: p.date,
    comment: p.comment,
    createdBy: p.createdBy,
  }
  subscriptionPayments[clinicId] = [...(subscriptionPayments[clinicId] ?? []), payment]
  const c = findClinic(clinicId)
  if (c) {
    c.subscription = {
      ...sub,
      lastPaymentDate: p.date,
      dueDate: addMonths(toDate(sub.dueDate) ?? p.date, 1),
      status: 'active',
    }
  }
  return ok(id)
}
export function removeSubscriptionPayment(clinicId: string, paymentId: string) {
  subscriptionPayments[clinicId] = (subscriptionPayments[clinicId] ?? []).filter((p) => p.id !== paymentId)
  return ok(undefined)
}

// ---- Stats ----
function compute(): AdminStats {
  const now = new Date()
  return {
    patientCount: data.members.filter((m) => m.role === 'user').length,
    monthlyRevenue: data.patientPayments
      .filter((p) => {
        const d = toDate(p.date)
        return d ? monthKey(d) === monthKey(now) : false
      })
      .reduce((sum, p) => sum + p.amount, 0),
    plansSent: data.mealPlans.filter((p) => !p.isTemplate && p.status === 'active').length,
    updatedAt: data.stats.updatedAt,
  }
}
export function getStats(_clinicId: string) {
  return ok({ id: 'summary', ...data.stats })
}
export function recomputeStats(_clinicId: string) {
  data.stats = { ...compute(), updatedAt: new Date() }
  return ok(data.stats)
}

export function getDashboard(_clinicId: string) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in7Days = addDays(startOfToday, 7)
  const diaryFrom = toDayKey(addDays(now, -55)) // ~8 semanas para la serie de adherencia
  const diaryTo = toDayKey(now)
  return ok(
    buildDashboard({
      members: data.members,
      payments: data.patientPayments,
      weekAppointments: data.appointments.filter((a) => {
        const start = toDate(a.startAt)
        return start ? start >= startOfToday && start < in7Days : false
      }),
      diaryEntries: Object.values(data.diary)
        .flat()
        .filter((e) => e.dayKey >= diaryFrom && e.dayKey <= diaryTo),
      activePlans: data.mealPlans.filter((p) => p.status === 'active' && !p.isTemplate).length,
    }),
  )
}

export function getPlatformStats() {
  return ok({
    pacientes: data.members.filter((m) => m.role === 'user').length,
    mealPlans: data.mealPlans.length,
    consultorios: clinics.length,
  })
}

// ---- Memberships ----
export function listMembershipsForUser(uid: string, isSuperAdmin?: boolean) {
  // Super-admin: admin en TODOS los clinics.
  if (isSuperAdmin) {
    return ok(
      clinics.map(
        (c) =>
          ({
            clinicId: c.id,
            memberId: uid,
            clinicName: c.name,
            clinicLogoURL: c.logoURL,
            clinicTheme: c.theme,
            role: 'admin',
          }) satisfies Membership,
      ),
    )
  }
  const member = data.members.find((m) => m.uid === uid)
  if (!member) return ok([] as Membership[])
  return ok([
    {
      clinicId: DEMO_CLINIC_ID,
      memberId: member.id,
      clinicName: data.clinic.name,
      clinicLogoURL: data.clinic.logoURL,
      clinicTheme: data.clinic.theme,
      role: member.role,
    },
  ] satisfies Membership[])
}
