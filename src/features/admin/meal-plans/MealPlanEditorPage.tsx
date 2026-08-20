import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookmarkPlus, Save, UserPlus } from 'lucide-react'
import type { MealPlanDay } from '@/types'
import { DEFAULT_CLINIC_SETTINGS } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useClinic } from '@/hooks/useClinic'
import { useMembers } from '@/hooks/useMembers'
import {
  useAssignPlanToPatient,
  useCreateMealPlan,
  useMealPlan,
  useSaveAsTemplate,
  useUpdateMealPlan,
} from '@/hooks/useMealPlans'
import { useToastAction } from '@/hooks/useToastAction'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  FormField,
  FullPageSpinner,
  Input,
  Text,
  Textarea,
  Toggle,
} from '@/components/ui'
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog'
import { planDailyAverage } from '@/utils/nutrition'
import { adminMealPlanDetail, ROUTES } from '@/routes/routePaths'
import { MealPlanBuilder } from './MealPlanBuilder'
import { AssignPlanModal } from './AssignPlanModal'
import {
  emptyDraft,
  PLAN_STATUS_LABELS,
  PLAN_STATUS_TONES,
  planToDraft,
  type MealPlanDraft,
} from './planMeta'

function snapshot(draft: MealPlanDraft): string {
  return JSON.stringify(draft)
}

export function MealPlanEditorPage() {
  const { planId } = useParams()
  const [searchParams] = useSearchParams()
  const isNew = !planId || planId === 'new'
  const { user } = useAuth()
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const navigate = useNavigate()
  const run = useToastAction()

  const { data: existing, isLoading } = useMealPlan(clinicId, isNew ? '' : (planId as string))
  const { data: members = [] } = useMembers(clinicId)
  const { data: clinic } = useClinic(clinicId)
  const settings = clinic?.settings ?? DEFAULT_CLINIC_SETTINGS
  const create = useCreateMealPlan(clinicId)
  const update = useUpdateMealPlan(clinicId)
  const assign = useAssignPlanToPatient(clinicId)
  const saveTemplate = useSaveAsTemplate(clinicId)

  const patients = useMemo(() => members.filter((m) => m.role === 'user'), [members])
  const prefillMemberId = searchParams.get('memberId') ?? ''

  const [draft, setDraft] = useState<MealPlanDraft>(() =>
    emptyDraft(prefillMemberId ? { memberId: prefillMemberId } : undefined),
  )
  const [baseline, setBaseline] = useState(() => snapshot(draft))
  const [assignOpen, setAssignOpen] = useState(false)
  const [hydratedId, setHydratedId] = useState<string | null>(null)

  if (!isNew && existing && hydratedId !== existing.id) {
    const next = planToDraft(existing)
    setDraft(next)
    setBaseline(snapshot(next))
    setHydratedId(existing.id)
  }

  const dirty = snapshot(draft) !== baseline
  const unsaved = useUnsavedChanges(dirty)
  const avg = planDailyAverage({ days: draft.days })
  const assignedName = draft.memberId
    ? patients.find((p) => p.id === draft.memberId)?.fullName
    : undefined

  const patch = (partial: Partial<MealPlanDraft>) => setDraft((d) => ({ ...d, ...partial }))

  const persist = async (next: MealPlanDraft = draft): Promise<string> => {
    if (!next.name.trim()) throw new Error('Ponéle un nombre al plan')
    const payload = {
      ...next,
      name: next.name.trim(),
      description: next.description?.trim() || undefined,
      generalNotes: next.generalNotes?.trim() || undefined,
    }
    if (isNew) {
      return create.mutateAsync({ ...payload, createdBy: user?.uid ?? '' })
    }
    await update.mutateAsync({ planId: planId as string, data: payload })
    return planId as string
  }

  const handleSave = async () => {
    let savedId = ''
    const ok = await run(
      async () => {
        savedId = await persist()
      },
      {
        success: isNew ? 'Plan creado' : 'Plan guardado',
        error: 'No se pudo guardar el plan',
      },
    )
    if (!ok) return
    setBaseline(snapshot(draft))
    if (isNew) {
      unsaved.allowNextNavigation()
      navigate(adminMealPlanDetail(savedId), { replace: true })
    }
  }

  const handleAssign = async (member: { id: string; uid: string }) => {
    const next: MealPlanDraft = { ...draft, isTemplate: false }
    let savedId = ''
    const saved = await run(
      async () => {
        savedId = await persist(next)
      },
      { error: 'No se pudo guardar el plan antes de asignarlo' },
    )
    if (!saved) return
    const ok = await run(() => assign.mutateAsync({ planId: savedId, member }), {
      success: 'Plan asignado y activo',
      error: 'No se pudo asignar el plan',
    })
    if (!ok) return
    const assigned: MealPlanDraft = {
      ...next,
      memberId: member.id,
      memberUid: member.uid,
      status: 'active',
    }
    setAssignOpen(false)
    setDraft(assigned)
    setBaseline(snapshot(assigned))
    if (isNew) {
      unsaved.allowNextNavigation()
      navigate(adminMealPlanDetail(savedId), { replace: true })
    }
  }

  const handleSaveTemplate = async () => {
    if (isNew) {
      let savedId = ''
      const ok = await run(
        async () => {
          savedId = await persist({
            ...draft,
            isTemplate: true,
            memberId: '',
            memberUid: '',
            status: 'draft',
          })
        },
        { success: 'Plantilla creada', error: 'No se pudo guardar la plantilla' },
      )
      if (ok) {
        unsaved.allowNextNavigation()
        navigate(adminMealPlanDetail(savedId), { replace: true })
      }
      return
    }
    if (!existing) return
    await run(
      () => saveTemplate.mutateAsync({ plan: existing, name: draft.name.trim() || existing.name }),
      {
        success: 'Guardado como plantilla',
        error: 'No se pudo guardar la plantilla',
      },
    )
  }

  if (!isNew && isLoading) {
    return (
      <AppLayout title="Plan alimentario">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  if (!isNew && !existing) {
    return (
      <AppLayout title="Plan alimentario">
        <p className="text-sm text-zinc-500">No se encontró el plan.</p>
      </AppLayout>
    )
  }

  const saving = create.isPending || update.isPending || assign.isPending

  return (
    <AppLayout title={isNew ? 'Nuevo plan' : draft.name || 'Plan alimentario'}>
      <button
        type="button"
        onClick={() => navigate(ROUTES.ADMIN_MEAL_PLANS)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="size-4" /> Volver a planes
      </button>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {draft.isTemplate ? (
              <Badge tone="violet">Plantilla</Badge>
            ) : (
              <Badge tone={PLAN_STATUS_TONES[draft.status]}>{PLAN_STATUS_LABELS[draft.status]}</Badge>
            )}
            {assignedName && <Badge tone="brand">{assignedName}</Badge>}
            {dirty && <Badge tone="amber">Sin guardar</Badge>}
          </div>
          {settings.showCalories && avg.kcal > 0 && (
            <Text variant="caption" className="mt-1">
              Promedio ≈ {Math.round(avg.kcal)} kcal/día
              {draft.targetKcal ? ` · meta ${draft.targetKcal} kcal` : ''}
            </Text>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!draft.isTemplate && (
            <Button
              variant="secondary"
              leftIcon={<UserPlus className="size-4" />}
              onClick={() => setAssignOpen(true)}
            >
              Asignar y activar
            </Button>
          )}
          {!draft.isTemplate && (
            <Button
              variant="secondary"
              leftIcon={<BookmarkPlus className="size-4" />}
              onClick={() => void handleSaveTemplate()}
              loading={saveTemplate.isPending || (isNew && create.isPending)}
            >
              Guardar como plantilla
            </Button>
          )}
          <Button leftIcon={<Save className="size-4" />} onClick={() => void handleSave()} loading={saving} disabled={!dirty && !isNew}>
            Guardar
          </Button>
        </div>
      </div>

      <Card className="mb-5 space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nombre del plan" required>
            <Input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Ej. Plan hipocalórico 1600"
            />
          </FormField>
          <FormField label="Meta calórica (kcal/día)" hint="Opcional: referencia para el paciente">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.targetKcal ?? ''}
              onChange={(e) =>
                patch({ targetKcal: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="1600"
            />
          </FormField>
        </div>
        <FormField label="Descripción">
          <Input
            value={draft.description ?? ''}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Ej. Semana de entrenamiento"
          />
        </FormField>
        <FormField label="Indicaciones generales">
          <Textarea
            rows={2}
            value={draft.generalNotes ?? ''}
            onChange={(e) => patch({ generalNotes: e.target.value })}
            placeholder="Ej. Tomar 2 L de agua. Cocinar sin sal."
          />
        </FormField>
        {isNew && (
          <Toggle
            checked={draft.isTemplate}
            onChange={(checked) =>
              patch(
                checked
                  ? { isTemplate: true, memberId: '', memberUid: '', status: 'draft' }
                  : { isTemplate: false },
              )
            }
            label="Guardar como plantilla reutilizable"
            tooltip="Las plantillas no se asignan a un paciente: se copian para armar planes nuevos."
          />
        )}
      </Card>

      <MealPlanBuilder
        days={draft.days}
        onChange={(days: MealPlanDay[]) => patch({ days })}
        settings={settings}
      />

      {assignOpen && (
        <AssignPlanModal
          open
          onClose={() => setAssignOpen(false)}
          planName={draft.name}
          patients={patients}
          defaultMemberId={draft.memberId || prefillMemberId}
          onAssign={(member) => void handleAssign(member)}
          loading={saving}
        />
      )}

      <UnsavedChangesDialog open={unsaved.blocked} onStay={unsaved.stay} onLeave={unsaved.leave} />
    </AppLayout>
  )
}
