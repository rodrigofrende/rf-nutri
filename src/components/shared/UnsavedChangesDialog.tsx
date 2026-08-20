import { ConfirmDialog } from '@/components/ui'

export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean
  onStay: () => void
  onLeave: () => void
}) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onStay}
      onConfirm={onLeave}
      title="Hay cambios sin guardar"
      description="Si salís ahora, se pierde lo que cargaste en esta pantalla. ¿Querés salir igual?"
      confirmLabel="Salir sin guardar"
      cancelLabel="Seguir editando"
      tone="danger"
    />
  )
}
