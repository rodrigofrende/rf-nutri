import { useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { NotebookPen, Plus, Target, Trash2, Weight } from 'lucide-react'
import type { NoteType } from '@/types'
import { useCreateNote, useNotes, useRemoveNote } from '@/hooks/useMemberNotes'
import { useToastAction } from '@/hooks/useToastAction'
import { Badge, Button, Card, EmptyState, IconButton, Input, Select, Spinner, Text } from '@/components/ui'
import { formatDate } from '@/utils/format'

const TYPE_META: Record<
  NoteType,
  { label: string; tone: 'brand' | 'green' | 'neutral'; icon: typeof Target; placeholder: string }
> = {
  objective: { label: 'Objetivo', tone: 'brand', icon: Target, placeholder: 'Ej. bajar 4kg en 2 meses' },
  weight: { label: 'Peso', tone: 'green', icon: Weight, placeholder: 'Ej. 82kg' },
  observation: {
    label: 'Observación',
    tone: 'neutral',
    icon: NotebookPen,
    placeholder: 'Ej. mejorar técnica de dominadas',
  },
}

/**
 * Tab de notas privadas del admin. Este componente y sus hooks NUNCA se importan
 * del lado del paciente — es la barrera de UI (la otra barrera son las Security Rules).
 */
export function NotesTab({
  clinicId,
  memberId,
  adminUid,
}: {
  clinicId: string
  memberId: string
  adminUid: string
}) {
  const run = useToastAction()
  const { data: notes = [], isLoading } = useNotes(clinicId, memberId)
  const createNote = useCreateNote(clinicId, memberId)
  const removeNote = useRemoveNote(clinicId, memberId)
  const [type, setType] = useState<NoteType>('observation')
  const [value, setValue] = useState('')

  const add = async () => {
    if (!value.trim()) return
    const ok = await run(
      () =>
        createNote.mutateAsync({
          type,
          value: value.trim(),
          date: Timestamp.now(),
          createdBy: adminUid,
        }),
      { success: 'Nota agregada', error: 'No se pudo guardar la nota' },
    )
    if (ok) setValue('')
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Text variant="label" className="mb-3">
          Agregar anotación privada
        </Text>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="sm:w-44">
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as NoteType)}
              options={[
                { value: 'objective', label: 'Objetivo' },
                { value: 'weight', label: 'Peso' },
                { value: 'observation', label: 'Observación' },
              ]}
            />
          </div>
          <Input
            className="flex-1"
            placeholder={TYPE_META[type].placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button leftIcon={<Plus className="size-4" />} loading={createNote.isPending} onClick={add}>
            Agregar
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Sin anotaciones"
          description="Registrá objetivos, seguimiento de peso u observaciones del paciente."
        />
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const meta = TYPE_META[note.type]
            const Icon = meta.icon
            return (
              <Card key={note.id} className="flex items-start gap-3 p-5">
                <div className="mt-0.5 text-zinc-400">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <span className="text-xs text-zinc-400">{formatDate(note.date)}</span>
                  </div>
                  <Text className="mt-1">{note.value}</Text>
                </div>
                <IconButton
                  icon={<Trash2 className="size-4" />}
                  label="Eliminar nota"
                  tone="danger"
                  onClick={() => removeNote.mutate(note.id)}
                />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
