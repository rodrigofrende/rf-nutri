import { useState } from 'react'
import { Ban, Plus, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FormField,
  FullPageSpinner,
  IconButton,
  InfoTooltip,
  Input,
  Text,
} from '@/components/ui'
import { useToastAction } from '@/hooks/useToastAction'
import { useBlockEmail, useBlockedEmails, useUnblockEmail } from '@/hooks/useBlockedEmails'
import { normalizeEmailKey } from '@/utils/loginEmail'
import { formatDate } from '@/utils/format'
import type { BlockedEmail } from '@/types'

/**
 * Emails vetados de la plataforma (solo super-admin).
 *
 * "Vetado" y no "bloqueado" a propósito: en el resto de la app "Bloqueado" ya
 * significa "debe la cuota" (PaymentState), y mezclar las dos palabras vuelve
 * imposible cualquier conversación de soporte.
 *
 * Lo que hace un veto: el email no puede crear contraseña, no resuelve su clinic, y
 * ningún admin puede darlo de alta como paciente. Lo que NO hace: cerrar una sesión
 * ya abierta ni borrar datos del paciente. Ver blockedEmailsService.
 */
export function BlockedEmailsPage() {
  const run = useToastAction()
  const { data: blocked = [], isLoading } = useBlockedEmails()
  const block = useBlockEmail()
  const unblock = useUnblockEmail()

  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toRemove, setToRemove] = useState<BlockedEmail | null>(null)

  const submit = async () => {
    const key = normalizeEmailKey(email)
    if (!key.includes('@')) {
      setError('Ingresá un email válido')
      return
    }
    if (blocked.some((b) => b.id === key)) {
      setError('Ese email ya está vetado')
      return
    }
    setError(null)
    const ok = await run(() => block.mutateAsync({ email: key, reason }), {
      success: 'Email vetado',
      error: 'No se pudo vetar el email',
    })
    if (ok) {
      setEmail('')
      setReason('')
    }
  }

  const remove = async () => {
    if (!toRemove) return
    const ok = await run(() => unblock.mutateAsync(toRemove.id), {
      success: 'Veto levantado',
      error: 'No se pudo levantar el veto',
    })
    if (ok) setToRemove(null)
  }

  return (
    <AppLayout
      title="Emails vetados"
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          Emails a los que se les niega el acceso a la plataforma.
          <InfoTooltip text="Un email vetado no puede crear contraseña ni ser dado de alta como paciente, y se comporta como si no existiera. Si tiene una sesión abierta, sigue hasta que cierre sesión." />
        </span>
      }
    >
      <Card className="mb-5 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto] sm:items-end">
          <FormField label="Email" error={error ?? undefined} required>
            <Input
              type="email"
              placeholder="alguien@gmail.com"
              value={email}
              invalid={!!error}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Motivo" tooltip="Nota interna. El usuario vetado nunca la ve.">
            <Input
              placeholder="Spam en el formulario de contacto"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
          <Button
            leftIcon={<Plus className="size-4" />}
            loading={block.isPending}
            onClick={() => void submit()}
          >
            Vetar email
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <FullPageSpinner />
      ) : blocked.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="Nadie vetado"
          description="Cuando vetes un email va a aparecer acá. Sirve para cortarle el acceso a la plataforma a alguien que abusa del contacto o del alta."
        />
      ) : (
        <div className="space-y-2">
          {blocked.map((b) => (
            <Card key={b.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">{b.email}</p>
                <Text variant="caption" className="truncate">
                  {[b.reason, formatDate(b.createdAt)].filter((v) => v && v !== '—').join(' · ') ||
                    'Sin motivo anotado'}
                </Text>
              </div>
              <IconButton
                icon={<Trash2 className="size-4" />}
                label={`Levantar el veto de ${b.email}`}
                tone="danger"
                onClick={() => setToRemove(b)}
              />
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={() => void remove()}
        title="¿Levantar el veto?"
        description={`${toRemove?.email ?? ''} va a poder volver a usar la plataforma. Si era paciente de un consultorio, su acceso se restablece cuando un admin abra la lista de pacientes.`}
        // El default del diálogo es "Eliminar", que acá miente: no se borra un
        // email, se le devuelve el acceso.
        confirmLabel="Levantar veto"
        loading={unblock.isPending}
      />
    </AppLayout>
  )
}
