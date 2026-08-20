import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BodyFatFormula, ClinicSettings, PreferredUnits } from '@/types'
import { DEFAULT_CLINIC_SETTINGS } from '@/types'
import { updateClinicSettings } from '@/services/clinicsService'
import { useClinic } from '@/hooks/useClinic'
import { queryKeys } from '@/hooks/queryKeys'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  FormField,
  FullPageSpinner,
  Select,
  Toggle,
} from '@/components/ui'
import { cn } from '@/utils/cn'
import { mapFirestoreError } from '@/utils/firestoreErrors'

/** Orden canónico de fórmulas: mantiene el array estable para la comparación JSON. */
const ALL_FORMULAS: { value: BodyFatFormula; label: string }[] = [
  { value: 'durnin', label: 'Durnin-Womersley (4 pliegues)' },
  { value: 'faulkner', label: 'Faulkner (4 pliegues)' },
]

const UNITS_OPTIONS: { value: PreferredUnits; label: string }[] = [
  { value: 'grams', label: 'Gramos primero' },
  { value: 'household', label: 'Medidas caseras primero' },
  { value: 'both', label: 'Ambas' },
]

/**
 * Normaliza settings guardados contra los defaults: completa claves faltantes de
 * docs viejos y fija un orden de claves determinístico, para que la comparación
 * JSON de "hay cambios" no dé falsos positivos.
 */
function normalizeSettings(settings?: ClinicSettings): ClinicSettings {
  return {
    ...DEFAULT_CLINIC_SETTINGS,
    ...settings,
    anthropometry: {
      ...DEFAULT_CLINIC_SETTINGS.anthropometry,
      ...settings?.anthropometry,
    },
  }
}

export function ClinicSettingsPage() {
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const { notify } = useToast()
  const qc = useQueryClient()
  const { data: clinic, isLoading } = useClinic(clinicId)

  const saved = useMemo(() => normalizeSettings(clinic?.settings), [clinic])
  const [draft, setDraft] = useState<ClinicSettings>(saved)

  // Cuando lo persistido cambia (llegó el clinic, o se refrescó tras guardar),
  // el borrador se realinea en el mismo render (patrón "adjust state on prop
  // change" de React, sin useEffect ni render intermedio con datos viejos).
  const [lastSaved, setLastSaved] = useState<ClinicSettings>(saved)
  if (lastSaved !== saved) {
    setLastSaved(saved)
    setDraft(saved)
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const unsaved = useUnsavedChanges(dirty)
  // Con pliegues activos tiene que quedar al menos una fórmula: sin fórmula no
  // hay % de grasa que calcular y la sección quedaría muda.
  const formulasError = draft.anthropometry.skinfolds && draft.anthropometry.bodyFatFormulas.length === 0

  const save = useMutation({
    mutationFn: (settings: ClinicSettings) => updateClinicSettings(clinicId, settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinic(clinicId) })
      qc.invalidateQueries({ queryKey: queryKeys.clinics() })
      notify('Preferencias guardadas', 'success')
    },
    onError: (err) => notify(mapFirestoreError(err, 'No se pudieron guardar las preferencias'), 'error'),
  })

  const set = (patch: Partial<ClinicSettings>) => setDraft((d) => ({ ...d, ...patch }))
  const setAnthro = (patch: Partial<ClinicSettings['anthropometry']>) =>
    setDraft((d) => ({ ...d, anthropometry: { ...d.anthropometry, ...patch } }))

  const toggleFormula = (formula: BodyFatFormula) => {
    setDraft((d) => {
      const has = d.anthropometry.bodyFatFormulas.includes(formula)
      const next = has
        ? d.anthropometry.bodyFatFormulas.filter((f) => f !== formula)
        : // Se re-arma con el orden canónico para que el array quede estable
          ALL_FORMULAS.map((f) => f.value).filter(
            (f) => f === formula || d.anthropometry.bodyFatFormulas.includes(f),
          )
      return { ...d, anthropometry: { ...d.anthropometry, bodyFatFormulas: next } }
    })
  }

  const saveButton = (
    <Button
      onClick={() => save.mutate(draft)}
      loading={save.isPending}
      disabled={!dirty || formulasError}
    >
      Guardar cambios
    </Button>
  )

  return (
    <AppLayout
      title="Preferencias"
      subtitle="Todas las funciones están siempre disponibles: acá elegís con cuáles trabajás vos y qué ven tus pacientes."
      actions={saveButton}
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="max-w-3xl space-y-4">
          <Card>
            <CardHeader
              title="Plan alimentario"
              subtitle="Qué información nutricional se muestra en los planes."
            />
            <CardBody className="space-y-5">
              <Toggle
                checked={draft.showCalories}
                onChange={(v) => set({ showCalories: v })}
                label="Mostrar calorías"
                description="Los planes muestran kcal por comida y por día, también al paciente."
              />
              <Toggle
                checked={draft.showMacros}
                onChange={(v) => set({ showMacros: v })}
                label="Mostrar macros"
                description="Desglose de proteínas, carbohidratos y grasas."
              />
              <FormField
                label="Unidades preferidas"
                hint="Cómo se muestran las cantidades de los alimentos."
              >
                <Select
                  options={UNITS_OPTIONS}
                  value={draft.preferredUnits}
                  onChange={(e) => set({ preferredUnits: e.target.value as PreferredUnits })}
                />
              </FormField>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Diario del paciente"
              subtitle="Qué puede registrar el paciente en su diario alimentario."
            />
            <CardBody>
              <Toggle
                checked={draft.diaryPhotosEnabled}
                onChange={(v) => set({ diaryPhotosEnabled: v })}
                label="Fotos de comidas"
                description="El paciente puede adjuntar una foto por comida."
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Antropometría"
              subtitle="Qué secciones y cálculos se usan en las mediciones."
            />
            <CardBody className="space-y-5">
              <Toggle
                checked={draft.anthropometry.perimeters}
                onChange={(v) => setAnthro({ perimeters: v })}
                label="Perímetros"
                description="Sección de perímetros corporales (cintura, cadera, brazo, etc.)."
              />
              <div className="space-y-3">
                <Toggle
                  checked={draft.anthropometry.skinfolds}
                  onChange={(v) => setAnthro({ skinfolds: v })}
                  label="Pliegues cutáneos"
                  description="Sección de pliegues y cálculo de % de grasa corporal."
                />
                <div
                  className={cn(
                    'space-y-2 rounded-[var(--radius-control)] bg-zinc-50 p-3',
                    !draft.anthropometry.skinfolds && 'opacity-50',
                  )}
                >
                  <p className="text-xs font-medium text-zinc-500">Fórmulas de % de grasa</p>
                  {ALL_FORMULAS.map((f) => (
                    <label
                      key={f.value}
                      className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={draft.anthropometry.bodyFatFormulas.includes(f.value)}
                        disabled={!draft.anthropometry.skinfolds}
                        onChange={() => toggleFormula(f.value)}
                        className="size-4 rounded border-zinc-300 accent-brand-600"
                      />
                      {f.label}
                    </label>
                  ))}
                  {formulasError && (
                    <p role="alert" className="text-xs text-red-500">
                      Elegí al menos una fórmula para calcular % de grasa con pliegues.
                    </p>
                  )}
                </div>
              </div>
              <Toggle
                checked={draft.anthropometry.showBmi}
                onChange={(v) => setAnthro({ showBmi: v })}
                label="IMC"
                description="Índice de masa corporal y su categoría en cada medición."
              />
              <Toggle
                checked={draft.anthropometry.showEnergy}
                onChange={(v) => setAnthro({ showEnergy: v })}
                label="TMB y gasto energético (GET)"
                description="Estimación de tasa metabólica basal y gasto energético total."
              />
            </CardBody>
          </Card>

          {/* Botón repetido al pie: en mobile los toggles quedan lejos del header */}
          <div className="flex justify-end">{saveButton}</div>
        </div>
      )}
      <UnsavedChangesDialog open={unsaved.blocked} onStay={unsaved.stay} onLeave={unsaved.leave} />
    </AppLayout>
  )
}
