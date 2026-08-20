import { useLogs } from '@/hooks/useLogs'
import { useRoutines } from '@/hooks/useRoutines'
import { Spinner } from '@/components/ui'
import { WorkoutLogHistory } from '@/features/logs/WorkoutLogHistory'

/**
 * Progreso del paciente (solo lectura para el admin): historial de cargas por
 * ejercicio con la evolución a lo largo del tiempo. No permite editar.
 */
export function ProgressTab({ clinicId, memberId }: { clinicId: string; memberId: string }) {
  const { data: logs = [], isLoading } = useLogs(clinicId, memberId)
  const { data: routines = [] } = useRoutines(clinicId)

  if (isLoading) return <Spinner />

  return (
    <WorkoutLogHistory
      logs={logs}
      routines={routines}
      emptyDescription="El paciente todavía no registró cargas."
    />
  )
}
