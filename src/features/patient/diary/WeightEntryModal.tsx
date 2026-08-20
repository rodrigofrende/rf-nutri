import { useState } from 'react'
import type { WeightLog } from '@/types'
import { Button, FormField, Input, Modal } from '@/components/ui'

const NOTE_MAX = 200

/**
 * Registro del peso del día: un número en kg con 1 decimal y una nota opcional.
 * Upsert (1 doc por día): si ya había peso hoy, viene precargado para editar.
 */
export function WeightEntryModal({
  open,
  onClose,
  existing,
  onSave,
  saving,
}: {
  open: boolean
  onClose: () => void
  existing?: WeightLog
  onSave: (data: { weightKg: number; note?: string }) => void
  saving: boolean
}) {
  const [value, setValue] = useState(existing ? String(existing.weightKg) : '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [error, setError] = useState('')

  const submit = () => {
    // Aceptamos coma o punto: el teclado numérico es-AR suele ofrecer coma.
    const parsed = Number(value.replace(',', '.'))
    if (!value || Number.isNaN(parsed) || parsed <= 0) {
      setError('Ingresá tu peso en kg (ej. 72,5)')
      return
    }
    if (parsed < 20 || parsed > 400) {
      setError('Ese valor no parece un peso válido')
      return
    }
    // 1 decimal: es la precisión de una balanza hogareña, más es ruido.
    onSave({ weightKg: Math.round(parsed * 10) / 10, note: note.trim() || undefined })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Editar mi peso de hoy' : 'Registrar mi peso'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* El Input es hijo directo del FormField para que el label quede asociado */}
        <FormField label="Peso (kg)" error={error} required>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="400"
            placeholder="72,5"
            value={value}
            invalid={!!error}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            // El número es lo único que importa: grande y protagonista
            className="h-14 text-center text-2xl font-bold sm:h-14 sm:text-2xl"
            autoFocus
          />
        </FormField>

        <FormField label="Nota (opcional)" hint="Ej. en ayunas, después de entrenar…">
          <Input
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            placeholder="¿Algo para recordar de esta pesada?"
          />
        </FormField>
      </div>
    </Modal>
  )
}
