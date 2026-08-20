import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookmarkPlus,
  CalendarDays,
  Copy,
  Flame,
  LayoutTemplate,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  User,
  UtensilsCrossed,
} from 'lucide-react'
import type { MealPlan, MealPlanStatus } from '@/types'
import { DEFAULT_CLINIC_SETTINGS } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useClinic } from '@/hooks/useClinic'
import { useMembers } from '@/hooks/useMembers'
import {
  useDuplicateMealPlan,
  useMealPlans,
  useRemoveMealPlan,
  useSaveAsTemplate,
} from '@/hooks/useMealPlans'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FullPageSpinner,
  Heading,
  Spinner,
  Text,
  BusyOverlay,
} from '@/components/ui'
import { cn } from '@/utils/cn'
import { planDailyAverage } from '@/utils/nutrition'
import { adminMealPlanDetail, ROUTES } from '@/routes/routePaths'
import { PLAN_STATUS_LABELS, PLAN_STATUS_TONES } from './planMeta'
import { MEAL_PLANS_HELP } from '@/content/help'

type PlanBusyAction = 'duplicate' | 'template'

const BUSY_LABEL: Record<PlanBusyAction, string> = {
  duplicate: 'Duplicando…',
  template: 'Guardando plantilla…',
}
const STATUS_SECTIONS: { status: MealPlanStatus; title: string }[] = [
  { status: 'active', title: 'Activos' },
  { status: 'draft', title: 'Borradores' },
  { status: 'archived', title: 'Archivados' },
]

export function MealPlansListPage() {
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const navigate = useNavigate()
  const run = useToastAction()
  const { data: plans = [], isLoading } = useMealPlans(clinicId)
  const { data: members = [] } = useMembers(clinicId)
  const { data: clinic } = useClinic(clinicId)
  const settings = clinic?.settings ?? DEFAULT_CLINIC_SETTINGS
  const duplicate = useDuplicateMealPlan(clinicId)
  const saveTemplate = useSaveAsTemplate(clinicId)
  const remove = useRemoveMealPlan(clinicId)

  const [tab, setTab] = useState<'plans' | 'templates'>('plans')
  const [toDelete, setToDelete] = useState<MealPlan | null>(null)
  const [busy, setBusy] = useState<{ id: string; action: PlanBusyAction } | null>(null)

  // Nombre del paciente resuelto por memberId (el plan solo guarda el id)
  const memberNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) map.set(m.id, m.fullName)
    return map
  }, [members])

  const planList = useMemo(() => plans.filter((p) => !p.isTemplate), [plans])
  const templates = useMemo(() => plans.filter((p) => p.isTemplate), [plans])

  const handleDuplicate = async (plan: MealPlan) => {
    if (busy) return
    setBusy({ id: plan.id, action: 'duplicate' })
    try {
      await run(() => duplicate.mutateAsync({ plan }), {
        success: `Se creó "${plan.name} (copia)" como borrador`,
        error: 'No se pudo duplicar el plan',
      })
    } finally {
      setBusy(null)
    }
  }

  const handleSaveTemplate = async (plan: MealPlan) => {
    if (busy) return
    setBusy({ id: plan.id, action: 'template' })
    try {
      await run(() => saveTemplate.mutateAsync({ plan }), {
        success: 'Guardado como plantilla reutilizable',
        error: 'No se pudo guardar la plantilla',
      })
    } finally {
      setBusy(null)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => remove.mutateAsync(toDelete.id), {
      success: toDelete.isTemplate ? 'Plantilla eliminada' : 'Plan eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDelete(null)
  }

  const renderCard = (plan: MealPlan) => (
    <PlanCard
      key={plan.id}
      plan={plan}
      patientName={plan.memberId ? memberNames.get(plan.memberId) : undefined}
      showCalories={settings.showCalories}
      busyAction={busy?.id === plan.id ? busy.action : null}
      actionsDisabled={!!busy}
      onDuplicate={() => void handleDuplicate(plan)}
      onSaveTemplate={plan.isTemplate ? undefined : () => void handleSaveTemplate(plan)}
      onDelete={() => setToDelete(plan)}
    />
  )

  return (
    <AppLayout
      title="Planes alimentarios"
      subtitle="Armá, asigná y reutilizá los planes de tus pacientes."
      help={MEAL_PLANS_HELP}
      helpTitle="Cómo funcionan los planes"
      actions={
        <Button
          leftIcon={<Plus className="size-4" />}
          disabled={!!busy}
          onClick={() => navigate(ROUTES.ADMIN_MEAL_PLAN_NEW)}
        >
          Nuevo plan
        </Button>
      }
    >
      {/* Segmentos Planes / Plantillas: dos mundos distintos (uno se asigna, el otro se copia) */}
      <div
        className="mb-5 inline-flex rounded-[var(--radius-control)] border border-zinc-200 bg-surface p-1"
        role="tablist"
        aria-label="Tipo de plan"
      >
        <SegmentButton active={tab === 'plans'} disabled={!!busy} onClick={() => setTab('plans')}>
          Planes ({planList.length})
        </SegmentButton>
        <SegmentButton active={tab === 'templates'} disabled={!!busy} onClick={() => setTab('templates')}>
          Plantillas ({templates.length})
        </SegmentButton>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : tab === 'plans' ? (
        planList.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Sin planes"
            description="Creá el primer plan alimentario y asignáselo a un paciente cuando esté listo."
            action={
              <Button
                leftIcon={<Plus className="size-4" />}
                disabled={!!busy}
                onClick={() => navigate(ROUTES.ADMIN_MEAL_PLAN_NEW)}
              >
                Nuevo plan
              </Button>
            }
          />
        ) : (
          <div className="space-y-7">
            {STATUS_SECTIONS.map(({ status, title }) => {
              const items = planList.filter((p) => p.status === status)
              if (items.length === 0) return null
              return (
                <section key={status}>
                  <Heading variant="card" as="h2" className="mb-3">
                    {title} <span className="font-normal text-zinc-400">({items.length})</span>
                  </Heading>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map(renderCard)}
                  </div>
                </section>
              )
            })}
          </div>
        )
      ) : templates.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="Sin plantillas"
          description="Guardá un plan como plantilla desde su menú de acciones para reutilizarlo con otros pacientes."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(renderCard)}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title={toDelete?.isTemplate ? 'Eliminar plantilla' : 'Eliminar plan'}
        description={`¿Querés eliminar "${toDelete?.name}"?${toDelete?.status === 'active' && toDelete.memberId ? ' El paciente va a dejar de ver este plan.' : ''} Esta acción no se puede deshacer.`}
        loading={remove.isPending}
      />
    </AppLayout>
  )
}

function SegmentButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-[calc(var(--radius-control)-2px)] px-4 py-1.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active ? 'bg-brand-600 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-50',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {children}
    </button>
  )
}

function PlanCard({
  plan,
  patientName,
  showCalories,
  busyAction,
  actionsDisabled,
  onDuplicate,
  onSaveTemplate,
  onDelete,
}: {
  plan: MealPlan
  patientName?: string
  showCalories: boolean
  busyAction: PlanBusyAction | null
  actionsDisabled: boolean
  onDuplicate: () => void
  onSaveTemplate?: () => void
  onDelete: () => void
}) {
  const avg = planDailyAverage(plan)
  const daysLabel = plan.days.length === 1 ? '1 día' : `${plan.days.length} días`
  const busy = !!busyAction

  return (
    <Card className="relative flex flex-col p-5" aria-busy={busy}>
      {busyAction && <BusyOverlay label={BUSY_LABEL[busyAction]} />}

      <div className="flex items-start justify-between gap-2">
        <Link
          to={adminMealPlanDetail(plan.id)}
          className={cn(
            'min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            busy && 'pointer-events-none',
          )}
        >
          <Heading variant="card" className="truncate hover:text-brand-700">
            {plan.name || 'Plan sin nombre'}
          </Heading>
        </Link>
        <PlanActionsMenu
          plan={plan}
          busyAction={busyAction}
          disabled={actionsDisabled}
          onDuplicate={onDuplicate}
          onSaveTemplate={onSaveTemplate}
          onDelete={onDelete}
        />
      </div>

      {plan.description && (
        <Text variant="caption" className="mt-1 line-clamp-2">
          {plan.description}
        </Text>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {plan.isTemplate ? (
          <Badge tone="violet">Plantilla</Badge>
        ) : (
          <Badge tone={PLAN_STATUS_TONES[plan.status]}>{PLAN_STATUS_LABELS[plan.status]}</Badge>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
          <CalendarDays className="size-3.5" aria-hidden />
          {daysLabel}
        </span>
        {showCalories && avg.kcal > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
            <Flame className="size-3.5" aria-hidden />≈ {Math.round(avg.kcal)} kcal/día
          </span>
        )}
      </div>

      {!plan.isTemplate && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-zinc-100 pt-3 text-sm">
          <User className="size-4 shrink-0 text-zinc-400" aria-hidden />
          {plan.memberId ? (
            <span className="truncate text-zinc-700">{patientName ?? 'Paciente no encontrado'}</span>
          ) : (
            <span className="text-zinc-400">Sin asignar</span>
          )}
        </div>
      )}
    </Card>
  )
}

/**
 * Menú desplegable de acciones del plan: son 4 acciones y como fila de iconos
 * saturaban la card (el patrón de iconos queda para cards con 2 acciones).
 */
function PlanActionsMenu({
  plan,
  busyAction,
  disabled,
  onDuplicate,
  onSaveTemplate,
  onDelete,
}: {
  plan: MealPlan
  busyAction: PlanBusyAction | null
  disabled: boolean
  onDuplicate: () => void
  onSaveTemplate?: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const busy = !!busyAction

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (busy) return
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, busy])

  useEffect(() => {
    if (busy) setOpen(false)
  }, [busy])

  const itemClass =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'

  const closeThen = (fn: () => void) => () => {
    if (disabled) return
    setOpen(false)
    fn()
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`Acciones de ${plan.name || 'plan sin nombre'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setOpen((v) => !v)
        }}
        className="rounded-[var(--radius-control)] p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MoreVertical className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-[var(--radius-control)] border border-zinc-200 bg-surface py-1 shadow-lg"
        >
          <Link
            to={adminMealPlanDetail(plan.id)}
            role="menuitem"
            className={cn(itemClass, disabled && 'pointer-events-none')}
          >
            <Pencil className="size-4 text-zinc-400" aria-hidden />
            Editar
          </Link>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            disabled={disabled}
            onClick={() => {
              if (disabled) return
              setOpen(false)
              onDuplicate()
            }}
          >
            {busyAction === 'duplicate' ? (
              <Spinner className="size-4" />
            ) : (
              <Copy className="size-4 text-zinc-400" aria-hidden />
            )}
            {busyAction === 'duplicate' ? BUSY_LABEL.duplicate : 'Duplicar'}
          </button>
          {onSaveTemplate && (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              disabled={disabled}
              onClick={() => {
                if (disabled) return
                setOpen(false)
                onSaveTemplate()
              }}
            >
              {busyAction === 'template' ? (
                <Spinner className="size-4" />
              ) : (
                <BookmarkPlus className="size-4 text-zinc-400" aria-hidden />
              )}
              {busyAction === 'template' ? BUSY_LABEL.template : 'Guardar como plantilla'}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className={cn(itemClass, 'text-red-600 hover:bg-red-50 focus-visible:bg-red-50')}
            disabled={disabled}
            onClick={closeThen(onDelete)}
          >
            <Trash2 className="size-4" aria-hidden />
            Eliminar
          </button>
        </div>
      )}
    </div>
  )
}
