import { Link, useNavigate } from 'react-router-dom'
import { Plus, UtensilsCrossed } from 'lucide-react'
import type { ClinicSettings, MealPlan, Member } from '@/types'
import { useMealPlans } from '@/hooks/useMealPlans'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Spinner } from '@/components/ui'
import { planDailyAverage } from '@/utils/nutrition'
import { adminMealPlanDetail, ROUTES } from '@/routes/routePaths'
import { PLAN_STATUS_LABELS, PLAN_STATUS_TONES } from '@/features/admin/meal-plans/planMeta'
import { PageHelp } from '@/components/shared/PageHelp'
import { FICHA_PLAN_HELP } from '@/content/help'

export function MealPlanTab({
  clinicId,
  member,
  settings,
}: {
  clinicId: string
  member: Member
  settings: ClinicSettings
}) {
  const navigate = useNavigate()
  const { data: plans = [], isLoading } = useMealPlans(clinicId)
  const mine = plans.filter((p) => !p.isTemplate && p.memberId === member.id)
  const active = mine.filter((p) => p.status === 'active')
  const others = mine.filter((p) => p.status !== 'active')

  return (
    <div className="space-y-4">
      <PageHelp items={FICHA_PLAN_HELP} title="Cómo funciona el plan" compact />
      <Card>
        <CardHeader
          title="Plan alimentario"
          subtitle="El plan activo es el que ve el paciente en su app."
          action={
            <Button
              size="sm"
              leftIcon={<Plus className="size-4" />}
              onClick={() => navigate(`${ROUTES.ADMIN_MEAL_PLAN_NEW}?memberId=${member.id}`)}
            >
              Nuevo plan
            </Button>
          }
        />
        <CardBody>
          {isLoading ? (
            <Spinner />
          ) : mine.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="Sin plan asignado"
              description={`Creá un plan para ${member.fullName} y asignalo cuando esté listo.`}
              action={
                <Link
                  to={`${ROUTES.ADMIN_MEAL_PLAN_NEW}?memberId=${member.id}`}
                  className="inline-flex"
                >
                  <Button size="sm" leftIcon={<Plus className="size-4" />}>
                    Crear plan
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {active.map((plan) => (
                <PlanRow key={plan.id} plan={plan} settings={settings} />
              ))}
              {others.map((plan) => (
                <PlanRow key={plan.id} plan={plan} settings={settings} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function PlanRow({ plan, settings }: { plan: MealPlan; settings: ClinicSettings }) {
  const avg = planDailyAverage(plan)
  return (
    <Link
      to={adminMealPlanDetail(plan.id)}
      className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-zinc-200 p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900">{plan.name || 'Plan sin nombre'}</p>
        <p className="text-xs text-zinc-500">
          {plan.days.length === 1 ? '1 día' : `${plan.days.length} días`}
          {settings.showCalories && avg.kcal > 0 ? ` · ≈ ${Math.round(avg.kcal)} kcal/día` : ''}
        </p>
      </div>
      <Badge tone={PLAN_STATUS_TONES[plan.status]}>{PLAN_STATUS_LABELS[plan.status]}</Badge>
    </Link>
  )
}
