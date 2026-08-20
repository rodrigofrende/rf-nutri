import { useRef, useState, type ComponentType } from 'react'
import { Camera, Check, Trash2, X } from 'lucide-react'
import type { MealAdherence, MealDiaryEntry, MealSlot } from '@/types'
import { useToast } from '@/providers/ToastProvider'
import { Button, Modal, Textarea } from '@/components/ui'
import { cn } from '@/utils/cn'
import { fileToProductImageDataUrl, LogoImageError } from '@/utils/image'
import { MEAL_SLOT_LABELS } from '@/utils/nutrition'

const NOTE_MAX = 500

/** Los 3 estados posibles de una comida, con su tono (espejan el diario). */
const STATUS_OPTIONS: {
  value: MealAdherence
  label: string
  selected: string
  icon: ComponentType<{ className?: string }>
}[] = [
  { value: 'done', label: 'Cumplida', selected: 'border-emerald-500 bg-emerald-50 text-emerald-700', icon: Check },
  { value: 'partial', label: 'A medias', selected: 'border-amber-500 bg-amber-50 text-amber-700', icon: TildeIcon },
  { value: 'skipped', label: 'No pude', selected: 'border-red-500 bg-red-50 text-red-700', icon: X },
]

/** "~" como ícono: lucide no tiene un glifo de "a medias" que se lea tan directo. */
function TildeIcon({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center justify-center font-bold leading-none', className)} aria-hidden>
      ~
    </span>
  )
}

export function LogMealModal({
  open,
  onClose,
  slot,
  photosEnabled,
  existing,
  onSave,
  saving,
}: {
  open: boolean
  onClose: () => void
  slot: MealSlot
  /** Viene de clinic.settings.diaryPhotosEnabled: sin esto no se ofrece foto. */
  photosEnabled: boolean
  existing?: MealDiaryEntry
  onSave: (data: { status: MealAdherence; note?: string; photoURL?: string }) => void
  saving: boolean
}) {
  const { notify } = useToast()
  const [status, setStatus] = useState<MealAdherence | null>(existing?.status ?? null)
  const [note, setNote] = useState(existing?.note ?? '')
  const [photoURL, setPhotoURL] = useState(existing?.photoURL ?? '')
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    setProcessing(true)
    try {
      // Pipeline compartido de fotos (512px, ≤150KB): mismo tope que validan las rules.
      setPhotoURL(await fileToProductImageDataUrl(file))
    } catch (err) {
      notify(err instanceof LogoImageError ? err.message : 'No se pudo procesar la foto', 'error')
    } finally {
      setProcessing(false)
      // Permite volver a elegir el mismo archivo si lo quitó y se arrepintió.
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = () => {
    if (!status) return
    onSave({
      status,
      note: note.trim() || undefined,
      photoURL: photoURL || undefined,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={MEAL_SLOT_LABELS[slot]}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving} disabled={!status || processing}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">¿Cómo te fue con esta comida?</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Estado de la comida">
            {STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isActive = status === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    // Botones grandes: son EL gesto principal del diario en mobile
                    'flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    isActive ? opt.selected : 'border-zinc-200 bg-surface text-zinc-500 hover:border-zinc-300',
                  )}
                >
                  <Icon className="size-6" aria-hidden />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label htmlFor="diary-note" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Nota <span className="font-normal text-zinc-400">(opcional)</span>
          </label>
          <Textarea
            id="diary-note"
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="¿Cambiaste algo? ¿Cómo te sentiste?"
          />
          <p className="mt-1 text-right text-xs text-zinc-400">
            {note.length}/{NOTE_MAX}
          </p>
        </div>

        {photosEnabled && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-zinc-700">
              Foto <span className="font-normal text-zinc-400">(opcional)</span>
            </p>
            {photoURL ? (
              <div className="flex items-center gap-3">
                <img
                  src={photoURL}
                  alt="Foto de la comida"
                  className="size-24 rounded-xl border border-zinc-200 object-cover"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Trash2 className="size-4" />}
                  onClick={() => setPhotoURL('')}
                >
                  Quitar foto
                </Button>
              </div>
            ) : (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void pickPhoto(e.target.files?.[0])}
                />
                <Button
                  variant="secondary"
                  fullWidth
                  loading={processing}
                  leftIcon={<Camera className="size-4" />}
                  onClick={() => fileRef.current?.click()}
                >
                  Agregar una foto
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
