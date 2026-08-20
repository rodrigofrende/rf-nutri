import { useState } from 'react'
import { Download } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useImportSeedFoods } from '@/hooks/useFoods'
import { useToast } from '@/providers/ToastProvider'
import { Button, ConfirmDialog } from '@/components/ui'

/**
 * Importa el catálogo base de ~210 alimentos argentinos. Va con confirmación
 * porque escribe muchos documentos de una, pero el copy aclara que es seguro:
 * el import es idempotente (ids determinísticos) y NUNCA pisa alimentos ya
 * cargados o editados por el profesional.
 */
export function ImportSeedButton({ clinicId }: { clinicId: string }) {
  const { user } = useAuth()
  const { notify } = useToast()
  const importSeed = useImportSeedFoods(clinicId)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleImport = async () => {
    try {
      const imported = await importSeed.mutateAsync(user?.uid ?? '')
      // n = 0 significa que ya estaba todo: lo decimos en positivo para que no
      // parezca que el import falló.
      notify(
        imported > 0
          ? `${imported} alimentos importados`
          : 'Tu catálogo ya tenía todos los alimentos base. No se duplicó nada.',
        'success',
      )
      setConfirmOpen(false)
    } catch {
      notify('No se pudo importar el catálogo base. Probá de nuevo.', 'error')
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        leftIcon={<Download className="size-4" />}
        onClick={() => setConfirmOpen(true)}
      >
        Importar catálogo base
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleImport}
        title="Importar catálogo base"
        description="Suma ~210 alimentos comunes de la mesa argentina (valores por 100 g aproximados, estilo tablas ARGENFOODS) para que no arranques de cero. No pisa los alimentos que ya cargaste ni tus ediciones, y podés repetir el import cuando quieras: solo agrega lo que falte."
        confirmLabel="Importar"
        tone="primary"
        loading={importSeed.isPending}
      />
    </>
  )
}
