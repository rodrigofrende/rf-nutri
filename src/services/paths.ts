/** Constructores de paths de Firestore — una sola fuente de verdad. */
export const paths = {
  users: () => 'users',
  user: (uid: string) => `users/${uid}`,
  userClinicMemberships: (uid: string) => `users/${uid}/clinicMemberships`,
  userClinicMembership: (uid: string, clinicId: string) =>
    `users/${uid}/clinicMemberships/${clinicId}`,

  memberLoginIndex: (emailKey: string) => `memberLoginIndex/${emailKey}`,

  clinics: () => 'clinics',
  clinic: (clinicId: string) => `clinics/${clinicId}`,

  // Presentación pública del consultorio (top-level, legible sin login).
  publicProfiles: () => 'publicProfiles',
  publicProfile: (clinicId: string) => `publicProfiles/${clinicId}`,

  // Planes de suscripción de la plataforma (top-level).
  plans: () => 'plans',
  plan: (planId: string) => `plans/${planId}`,

  // Emails vetados (top-level). La clave es el email normalizado, para que las
  // rules puedan resolverlo por path con un exists() y sin queries.
  blockedEmails: () => 'blockedEmails',
  blockedEmail: (emailKey: string) => `blockedEmails/${emailKey}`,

  members: (clinicId: string) => `clinics/${clinicId}/members`,
  member: (clinicId: string, memberId: string) => `clinics/${clinicId}/members/${memberId}`,

  notes: (clinicId: string, memberId: string) =>
    `clinics/${clinicId}/members/${memberId}/notes`,
  note: (clinicId: string, memberId: string, noteId: string) =>
    `clinics/${clinicId}/members/${memberId}/notes/${noteId}`,

  anthropometry: (clinicId: string, memberId: string) =>
    `clinics/${clinicId}/members/${memberId}/anthropometry`,
  anthropometryRecord: (clinicId: string, memberId: string, recordId: string) =>
    `clinics/${clinicId}/members/${memberId}/anthropometry/${recordId}`,

  diary: (clinicId: string, memberId: string) =>
    `clinics/${clinicId}/members/${memberId}/diary`,
  diaryEntry: (clinicId: string, memberId: string, entryId: string) =>
    `clinics/${clinicId}/members/${memberId}/diary/${entryId}`, // entryId = `${dayKey}_${slot}`

  weightLogs: (clinicId: string, memberId: string) =>
    `clinics/${clinicId}/members/${memberId}/weightLogs`,
  weightLog: (clinicId: string, memberId: string, dayKey: string) =>
    `clinics/${clinicId}/members/${memberId}/weightLogs/${dayKey}`,

  checkIns: (clinicId: string, memberId: string) =>
    `clinics/${clinicId}/members/${memberId}/checkIns`,
  checkIn: (clinicId: string, memberId: string, weekKey: string) =>
    `clinics/${clinicId}/members/${memberId}/checkIns/${weekKey}`,

  // Cobros a pacientes: colección per-clinic (historial general = una sola query).
  payments: (clinicId: string) => `clinics/${clinicId}/payments`,
  payment: (clinicId: string, paymentId: string) => `clinics/${clinicId}/payments/${paymentId}`,

  // Cuotas SaaS del consultorio a la plataforma (escribe super-admin).
  subscriptionPayments: (clinicId: string) => `clinics/${clinicId}/subscriptionPayments`,
  subscriptionPayment: (clinicId: string, paymentId: string) =>
    `clinics/${clinicId}/subscriptionPayments/${paymentId}`,

  mealPlans: (clinicId: string) => `clinics/${clinicId}/mealPlans`,
  mealPlan: (clinicId: string, planId: string) => `clinics/${clinicId}/mealPlans/${planId}`,

  foods: (clinicId: string) => `clinics/${clinicId}/foods`,
  food: (clinicId: string, foodId: string) => `clinics/${clinicId}/foods/${foodId}`,

  tariffs: (clinicId: string) => `clinics/${clinicId}/tariffs`,
  tariff: (clinicId: string, tariffId: string) => `clinics/${clinicId}/tariffs/${tariffId}`,

  appointments: (clinicId: string) => `clinics/${clinicId}/appointments`,
  appointment: (clinicId: string, appointmentId: string) =>
    `clinics/${clinicId}/appointments/${appointmentId}`,

  statsSummary: (clinicId: string) => `clinics/${clinicId}/stats/summary`,
}
