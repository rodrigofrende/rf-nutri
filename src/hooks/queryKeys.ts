/** Factory de query keys de TanStack Query — evita strings sueltos y typos. */
export const queryKeys = {
  memberships: (uid: string) => ['memberships', uid] as const,
  clinics: () => ['clinics'] as const,
  clinic: (clinicId: string) => ['clinic', clinicId] as const,
  clinicPresentation: (clinicId: string) => ['clinicPresentation', clinicId] as const,
  clinicPresentations: () => ['clinicPresentations'] as const,
  plans: () => ['plans'] as const,
  blockedEmails: () => ['blockedEmails'] as const,
  members: (clinicId: string) => ['members', clinicId] as const,
  member: (clinicId: string, memberId: string) => ['member', clinicId, memberId] as const,
  notes: (clinicId: string, memberId: string) => ['notes', clinicId, memberId] as const,
  anthropometry: (clinicId: string, memberId: string) =>
    ['anthropometry', clinicId, memberId] as const,
  diary: (clinicId: string, memberId: string, fromDayKey: string, toDayKey: string) =>
    ['diary', clinicId, memberId, fromDayKey, toDayKey] as const,
  weightLogs: (clinicId: string, memberId: string) => ['weightLogs', clinicId, memberId] as const,
  checkIns: (clinicId: string, memberId: string) => ['checkIns', clinicId, memberId] as const,
  payments: (clinicId: string) => ['payments', clinicId] as const,
  memberPayments: (clinicId: string, memberId: string) =>
    ['payments', clinicId, 'member', memberId] as const,
  myPayments: (clinicId: string, memberUid: string) =>
    ['payments', clinicId, 'mine', memberUid] as const,
  subscriptionPayments: (clinicId: string) => ['subscriptionPayments', clinicId] as const,
  mealPlans: (clinicId: string) => ['mealPlans', clinicId] as const,
  mealPlan: (clinicId: string, planId: string) => ['mealPlan', clinicId, planId] as const,
  myMealPlans: (clinicId: string, memberUid: string) =>
    ['mealPlans', clinicId, 'mine', memberUid] as const,
  foods: (clinicId: string) => ['foods', clinicId] as const,
  tariffs: (clinicId: string) => ['tariffs', clinicId] as const,
  appointments: (clinicId: string, fromKey: string, toKey: string) =>
    ['appointments', clinicId, fromKey, toKey] as const,
  myAppointments: (clinicId: string, memberUid: string) =>
    ['appointments', clinicId, 'mine', memberUid] as const,
  stats: (clinicId: string) => ['stats', clinicId] as const,
  dashboard: (clinicId: string) => ['dashboard', clinicId] as const,
  platformStats: () => ['platformStats'] as const,
}
