import { useEffect, useState } from 'react'
import type { Member } from '@/types'
import { Button, FormField, Modal, Select } from '@/components/ui'

/**
 * Asignación explícita del plan: elegí el paciente y el plan queda ACTIVO.
 * Es la única puerta de activación (no hay "status: activo" manual) porque
 * activar implica archivar el plan activo anterior del paciente, y eso merece
 * un paso consciente con el efecto explicado, no un select silencioso.
 */
export function AssignPlanModal({
  open,
  onClose,
  planName,
  patients,
  defaultMemberId,
  onAssign,
  loading,
}: {
  open: boolean
  onClose: () => void
  planName: string
  patients: Member[]
  defaultMemberId?: string
  onAssign: (member: Pick<Member, 'id' | 'uid'>) => void
  loading?: boolean
}) {
  const [memberId, setMemberId] = useState(defaultMemberId ?? '')

  // Re-sincroniza la preselección cada vez que se abre (el draft pudo cambiar)
  useEffect(() => {
    if (open) setMemberId(defaultMemberId ?? '')
  }, [open, defaultMemberId])

  const selected = patients.find((p) => p.id === memberId)

  const submit = () => {
    if (!selected) return
    onAssign({ id: selected.id, uid: selected.uid })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignar y activar plan"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" fullWidth className="sm:w-auto" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button fullWidth className="sm:w-auto" onClick={submit} loading={loading} disabled={!selected}>
            Asignar y activar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-zinc-600">
          El plan <span className="font-medium text-zinc-900">"{planName || 'sin nombre'}"</span> se
          guarda y queda <span className="font-medium text-zinc-900">activo</span> para el paciente que
          elijas. Si ya tenía un plan activo, ese se archiva automáticamente (nunca quedan dos activos).
        </p>

        {patients.length === 0 ? (
          <p className="rounded-[var(--radius-control)] bg-amber-50 p-3 text-sm text-amber-700">
            Todavía no tenés pacientes cargados. Crealo primero desde la sección Pacientes.
          </p>
        ) : (
          <FormField label="Paciente" required>
            <Select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="Elegí un paciente"
              options={patients.map((p) => ({ value: p.id, label: p.fullName }))}
            />
          </FormField>
        )}

        {selected && !selected.uid && (
          <p className="text-xs leading-relaxed text-zinc-500">
            {selected.fullName} todavía no activó su acceso: va a ver el plan apenas ingrese por primera
            vez con su email.
          </p>
        )}
      </div>
    </Modal>
  )
}
