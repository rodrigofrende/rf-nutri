import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, Dumbbell, LogOut } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { ROLE_LABEL } from '@/utils/roles'
import { mapFirestoreError } from '@/utils/firestoreErrors'
import { Button, Card, EmptyState, FullPageSpinner, Heading } from '@/components/ui'
import { defaultHomeForRole, ROUTES } from '@/routes/routePaths'

export function TenantSelectPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { memberships, isLoading, error, activeClinicId, role, selectClinic } = useTenant()

  // Si ya hay clinic activo (auto-seleccionado o elegido), saltar a la home del rol.
  useEffect(() => {
    if (activeClinicId && role) {
      navigate(defaultHomeForRole(role), { replace: true })
    }
  }, [activeClinicId, role, navigate])

  if (isLoading) return <FullPageSpinner />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
            <Dumbbell className="size-7" />
          </div>
          <Heading variant="display" className="mt-4">
            Elegí un consultorio
          </Heading>
          <p className="text-sm text-zinc-500">Tenés acceso a estos espacios</p>
        </div>

        {error ? (
          <EmptyState
            icon={Building2}
            title="No pudimos leer tus accesos"
            description={mapFirestoreError(error, 'Cerrá sesión y volvé a ingresar. Si persiste, revisá el alta del usuario.')}
            action={
              <Button variant="secondary" leftIcon={<LogOut className="size-4" />} onClick={handleLogout}>
                Cerrar sesión
              </Button>
            }
          />
        ) : memberships.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Todavía no tenés acceso"
            description="Pedile a tu consultorio que te agregue como paciente para empezar."
            action={
              <Button variant="secondary" leftIcon={<LogOut className="size-4" />} onClick={handleLogout}>
                Cerrar sesión
              </Button>
            }
          />
        ) : (
          <Card className="divide-y divide-zinc-100 overflow-hidden">
            {memberships.map((m) => (
              <button
                key={m.clinicId}
                onClick={() => selectClinic(m.clinicId)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-zinc-50"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Building2 className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-zinc-900">{m.clinicName}</p>
                  <p className="text-xs text-zinc-500">{ROLE_LABEL[m.role]}</p>
                </div>
                <ChevronRight className="size-5 text-zinc-400" />
              </button>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
