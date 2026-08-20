import { useMemo, useState } from 'react'
import { Clock, Flame, NotebookPen, Salad } from 'lucide-react'
import type { MealPlan, MealPlanItem, MealPlanMeal } from '@/types'
import { DEFAULT_CLINIC_SETTINGS, type PreferredUnits } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useClinic } from '@/hooks/useClinic'
import { useMyMealPlans } from '@/hooks/useMealPlans'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Card, CardBody, EmptyState, FullPageSpinner, Heading, Text } from '@/components/ui'
import { cn } from '@/utils/cn'
import { toDate } from '@/utils/format'
import { MY_PLAN_HELP } from '@/content/help'
import {
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  dayTotals,
  mealTotals,
  pctOfTarget,
  type MacroTotals,
} from '@/utils/nutrition'

/** Cantidad legible: 1.5 → "1,5" (es-AR), enteros sin decimales. */
const formatQty = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

const METRIC_UNITS = new Set(['g', 'gr', 'ml', 'cc'])

/**
 * Cantidad del ítem según las unidades preferidas del consultorio:
 * - 'both'      → "1 taza (200 g)" cuando hay gramos resueltos y la unidad no es métrica
 * - 'grams'     → prioriza "200 g" si hay gramos resueltos
 * - 'household' → la medida tal como la cargó el nutricionista ("1 taza")
 * Si falta el dato para la preferencia, cae a lo que haya (nunca queda vacío).
 */
function formatItemQuantity(item: MealPlanItem, units: PreferredUnits): string {
  const u = item.unit.trim().toLowerCase()
  const isMetric = METRIC_UNITS.has(u)
  const metricLabel = u === 'ml' || u === 'cc' ? 'ml' : 'g'
  const household = `${formatQty(item.quantity)} ${item.unit}`
  const grams =
    item.grams != null && item.grams > 0
      ? `${formatQty(Math.round(item.grams))} ${isMetric ? metricLabel : 'g'}`
      : null

  if (isMetric) return grams ?? household
  if (units === 'grams') return grams ?? household
  if (units === 'household') return household
  return grams ? `${household} (${grams})` : household
}

/** Macros compactos "P 30 · C 45 · G 12" (gramos redondeados). */
function MacroRow({ totals, className }: { totals: MacroTotals; className?: string }) {
  return (
    <span className={cn('text-xs text-zinc-500', className)}>
      P {Math.round(totals.protein)} · C {Math.round(totals.carbs)} · G {Math.round(totals.fat)}
    </span>
  )
}

export function MyPlanPage() {
  const { user } = useAuth()
  const { activeClinicId, activeMembership } = useTenant()
  const clinicId = activeClinicId as string
  const memberId = activeMembership?.memberId ?? ''
  const memberUid = user?.uid ?? ''

  const { data: plans = [], isLoading } = useMyMealPlans(clinicId, memberId, memberUid)
  const { data: clinic } = useClinic(clinicId)
  const settings = clinic?.settings ?? DEFAULT_CLINIC_SETTINGS

  // Plan vigente: el 'active' más reciente por updatedAt (si el admin dejó más
  // de uno activo por error, mostramos el último que tocó).
  const plan = useMemo<MealPlan | null>(() => {
    const actives = plans.filter((p) => p.status === 'active')
    if (actives.length === 0) return null
    return [...actives].sort(
      (a, b) => (toDate(b.updatedAt)?.getTime() ?? 0) - (toDate(a.updatedAt)?.getTime() ?? 0),
    )[0]
  }, [plans])

  const [dayIndex, setDayIndex] = useState(0)

  if (isLoading) {
    return (
      <AppLayout title="Mi plan" help={MY_PLAN_HELP} helpTitle="Cómo funciona tu plan">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  if (!plan || plan.days.length === 0) {
    return (
      <AppLayout title="Mi plan" help={MY_PLAN_HELP} helpTitle="Cómo funciona tu plan">
        <EmptyState
          icon={Salad}
          title="Todavía no tenés un plan"
          description="Tu nutricionista todavía no te asignó un plan. Escribile si creés que falta."
        />
      </AppLayout>
    )
  }

  // Si el plan cambió y el índice quedó fuera de rango, caemos al primer día.
  const day = plan.days[dayIndex] ?? plan.days[0]
  const totalsOfDay = dayTotals(day)
  const dayPct = settings.showCalories ? pctOfTarget(totalsOfDay.kcal, plan.targetKcal) : null

  // Solo las comidas con contenido, en el orden canónico de los 6 slots.
  const meals = MEAL_SLOTS.map((slot) => day.meals.find((m) => m.slot === slot)).filter(
    (m): m is MealPlanMeal => !!m && (m.items.length > 0 || !!m.notes),
  )

  return (
    <AppLayout title="Mi plan" subtitle={plan.name} help={MY_PLAN_HELP} helpTitle="Cómo funciona tu plan">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Encabezado del plan: nombre + kcal objetivo si el consultorio las muestra */}
        <div className="flex flex-wrap items-center gap-2">
          <Heading variant="card" as="h2" className="text-lg">
            {plan.name}
          </Heading>
          {settings.showCalories && plan.targetKcal ? (
            <Badge tone="brand">Objetivo: {Math.round(plan.targetKcal)} kcal</Badge>
          ) : null}
        </div>

        {plan.generalNotes && (
          <Card className="border-brand-200 bg-brand-50/60">
            <CardBody className="flex items-start gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <NotebookPen className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <Text variant="label" className="text-brand-800">
                  Indicaciones de tu nutricionista
                </Text>
                <Text className="mt-1 whitespace-pre-line text-brand-900">{plan.generalNotes}</Text>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Selector de día: chips horizontales, sin scrollbar (mobile-first) */}
        {plan.days.length > 1 && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1" role="tablist" aria-label="Días del plan">
            {plan.days.map((d, i) => (
              <button
                key={`${d.label}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === dayIndex}
                onClick={() => setDayIndex(i)}
                className={cn(
                  'h-10 shrink-0 whitespace-nowrap rounded-[var(--radius-pill)] border px-4 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  i === dayIndex
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-zinc-200 bg-surface text-zinc-600 hover:border-brand-300 hover:text-brand-700',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        {day.notes && (
          <Text variant="caption" className="whitespace-pre-line">
            {day.notes}
          </Text>
        )}

        {meals.length === 0 ? (
          <EmptyState
            icon={Salad}
            title="Este día no tiene comidas cargadas"
            description="Elegí otro día o consultale a tu nutricionista."
          />
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => {
              const totals = mealTotals(meal)
              const hasMacros = meal.items.some((it) => it.grams != null && it.per100)
              return (
                <Card key={meal.slot}>
                  <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3 sm:px-5">
                    <Heading variant="card" as="h3">
                      {MEAL_SLOT_LABELS[meal.slot]}
                    </Heading>
                    {meal.time && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400">
                        <Clock className="size-3.5" aria-hidden />
                        {meal.time}
                      </span>
                    )}
                    {settings.showCalories && hasMacros && (
                      <span className="ml-auto text-base font-bold text-zinc-900">
                        {Math.round(totals.kcal)} <span className="text-xs font-normal text-zinc-400">kcal</span>
                      </span>
                    )}
                  </div>
                  <CardBody className="p-4 sm:p-5">
                    {meal.items.length > 0 && (
                      <ul className="space-y-2.5">
                        {meal.items.map((item, i) => (
                          <li key={`${item.name}-${i}`} className="flex items-baseline justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                              {item.notes && <p className="text-xs text-zinc-500">{item.notes}</p>}
                            </div>
                            <span className="shrink-0 text-sm text-zinc-600">
                              {formatItemQuantity(item, settings.preferredUnits)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {meal.notes && (
                      <p className={cn('text-xs italic text-zinc-500', meal.items.length > 0 && 'mt-3')}>
                        {meal.notes}
                      </p>
                    )}
                    {settings.showMacros && hasMacros && (
                      <MacroRow totals={totals} className="mt-3 block" />
                    )}
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}

        {/* Total del día vs objetivo, solo si el consultorio muestra calorías */}
        {settings.showCalories && totalsOfDay.kcal > 0 && (
          <Card>
            <CardBody className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <Flame className="size-4 text-brand-600" aria-hidden />
                  Total del día
                </span>
                <span className="text-lg font-bold text-zinc-900">
                  {Math.round(totalsOfDay.kcal)}
                  {plan.targetKcal ? (
                    <span className="text-sm font-normal text-zinc-400"> / {Math.round(plan.targetKcal)} kcal</span>
                  ) : (
                    <span className="text-sm font-normal text-zinc-400"> kcal</span>
                  )}
                </span>
              </div>
              {dayPct != null && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        dayPct > 110 ? 'bg-amber-400' : 'bg-brand-500',
                      )}
                      style={{ width: `${Math.min(100, dayPct)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{Math.round(dayPct)}% del objetivo</p>
                </div>
              )}
              {settings.showMacros && <MacroRow totals={totalsOfDay} className="mt-3 block" />}
            </CardBody>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
