import { Dumbbell, Plus, Trash2 } from 'lucide-react'
import type { Routine } from '@/types'
import { useLogs } from '@/hooks/useLogs'
import { useToastAction } from '@/hooks/useToastAction'
import {
  useAssignRoutine,
  useMemberAssignments,
  useRemoveAssignment,
  useRoutines,
} from '@/hooks/useRoutines'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, IconButton, Select, Spinner, Text } from '@/components/ui'
import { formatDate } from '@/utils/format'
import { formatLogSet } from '@/utils/loadTypes'
import { routineIconMeta } from '@/utils/routineIcons'
import { useState } from 'react'

export function AssignmentsTab({ clinicId, memberId }: { clinicId: string; memberId: string }) {
  const run = useToastAction()
  const { data: routines = [] } = useRoutines(clinicId)
  const { data: assignments = [], isLoading } = useMemberAssignments(clinicId, memberId)
  const { data: logs = [] } = useLogs(clinicId, memberId)
  const assign = useAssignRoutine(clinicId)
  const removeAssignment = useRemoveAssignment(clinicId, memberId)
  const [routineId, setRoutineId] = useState('')

  const byId = (id: string): Routine | undefined => routines.find((r) => r.id === id)
  // Tipo de carga por nombre de ejercicio (para formatear las cargas del historial).
  const loadTypeByExercise = new Map(
    routines.flatMap((r) => r.exercises.map((e) => [e.name, e.loadType] as const)),
  )
  const assignedIds = new Set(assignments.map((a) => a.routineId))
  const available = routines.filter((r) => !assignedIds.has(r.id))

  const doAssign = async () => {
    if (!routineId) return
    const ok = await run(() => assign.mutateAsync({ memberUid: memberId, routineId, active: true }), {
      success: 'Rutina asignada',
      error: 'No se pudo asignar la rutina',
    })
    if (ok) setRoutineId('')
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Text variant="label" className="mb-3">
          Asignar rutina
        </Text>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            className="flex-1"
            value={routineId}
            onChange={(e) => setRoutineId(e.target.value)}
            placeholder={available.length ? 'Elegí una rutina' : 'No hay rutinas disponibles'}
            options={available.map((r) => ({ value: r.id, label: r.name }))}
          />
          <Button leftIcon={<Plus className="size-4" />} loading={assign.isPending} onClick={doAssign}>
            Asignar
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : assignments.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Sin rutinas asignadas" />
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const r = byId(a.routineId)
            const { icon: RoutineIcon } = routineIconMeta(r?.icon)
            return (
              <Card key={a.id} className="flex items-center gap-3 p-5">
                <RoutineIcon className="size-5 text-brand-500" />
                <div className="flex-1">
                  <Text variant="listItem">{r?.name ?? 'Rutina'}</Text>
                  <Text variant="caption">{r?.exercises.length ?? 0} ejercicios</Text>
                </div>
                <IconButton
                  icon={<Trash2 className="size-4" />}
                  label="Quitar rutina"
                  tone="danger"
                  onClick={() => removeAssignment.mutate(a.id)}
                />
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Cargas registradas" subtitle="Últimos registros del paciente" />
        <CardBody>
          {logs.length === 0 ? (
            <p className="text-sm text-zinc-500">El paciente todavía no registró cargas.</p>
          ) : (
            <ul className="space-y-2">
              {logs.slice(0, 12).map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between border-b border-zinc-50 pb-2 text-sm last:border-0"
                >
                  <span className="font-medium text-zinc-700">{log.exerciseName}</span>
                  <span className="flex items-center gap-2 text-zinc-500">
                    {log.sets.map((s, i) => (
                      <Badge key={i} tone="neutral">
                        {formatLogSet(s, loadTypeByExercise.get(log.exerciseName))}
                      </Badge>
                    ))}
                    <span className="text-xs text-zinc-400">{formatDate(log.date)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
