import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldX } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { defaultHomeForRole } from '@/routes/routePaths'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Heading, Text } from '@/components/ui'

export function UnauthorizedPage() {
  const navigate = useNavigate()
  const { role, isSuperAdmin } = useTenant()
  const home = defaultHomeForRole(role, { isSuperAdmin })

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(home, { replace: true })
  }

  return (
    <AppLayout title="Acceso restringido">
      <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <ShieldX className="size-7" aria-hidden />
        </div>
        <Heading variant="page" className="mt-4">
          No tenés acceso a esta página
        </Heading>
        <Text className="mt-2">
          Tu perfil no tiene permiso para ver esta sección. Volvé atrás o andá al inicio de tu
          cuenta.
        </Text>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="secondary" leftIcon={<ArrowLeft className="size-4" />} onClick={goBack}>
            Volver
          </Button>
          <Button onClick={() => navigate(home, { replace: true })}>Ir al inicio</Button>
        </div>
      </div>
    </AppLayout>
  )
}
