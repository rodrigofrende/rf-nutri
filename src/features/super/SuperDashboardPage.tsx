import { useNavigate } from 'react-router-dom'
import { Building2, ClipboardList, LogIn, Plus, ShieldCheck, Users, Wallet } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { useClinics } from '@/hooks/useClinics'
import { useClinicAdminCounts } from '@/hooks/useClinicAdminCounts'
import { usePlatformStats } from '@/hooks/useDashboard'
import { AppLayout } from '@/components/layout/AppLayout'
import { ROUTES, defaultHomeForRole } from '@/routes/routePaths'
import { getPaymentStatus } from '@/utils/payments'
import { Badge, Button, Card, CardHeader, EmptyState, FullPageSpinner, LogoImage, StatCard } from '@/components/ui'

export function SuperDashboardPage() {
  const navigate = useNavigate()
  const { selectClinic } = useTenant()
  const { data: clinics = [], isLoading } = useClinics()
  const { data: platform } = usePlatformStats()
  // Admins reales por clinic desde `members` (adminUids queda desactualizado
  // mientras el admin invitado no reclama su cuenta).
  const adminCounts = useClinicAdminCounts(clinics)
  const withDebt = clinics.filter(
    (g) => getPaymentStatus(g.subscription?.dueDate).state !== 'al_dia',
  ).length

  const enterClinic = (clinicId: string) => {
    selectClinic(clinicId)
    navigate(defaultHomeForRole('admin'))
  }

  return (
    <AppLayout
      title="Panel"
      subtitle="Gestioná los consultorios y sus administradores desde un solo lugar."
    >
      <div className="space-y-6">
        {isLoading ? (
          <FullPageSpinner />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={Building2} label="Consultorios" value={clinics.length} tone="brand" />
              <StatCard
                icon={ShieldCheck}
                label="Administradores"
                value={adminCounts.isLoading ? '…' : adminCounts.total}
                tone="green"
              />
              <StatCard icon={Wallet} label="Consultorios con deuda" value={withDebt} tone="amber" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard icon={Users} label="Pacientes (total)" value={platform?.pacientes ?? 0} />
              <StatCard
                icon={ClipboardList}
                label="Planes alimentarios (total)"
                value={platform?.mealPlans ?? 0}
                tone="green"
              />
            </div>

            <Card>
              <CardHeader
                title="Consultorios"
                subtitle="Entrá a operar como admin o gestioná altas y administradores."
                action={
                  <Button
                    size="sm"
                    leftIcon={<Plus className="size-4" />}
                    onClick={() => navigate(ROUTES.SUPER_CLINICS)}
                  >
                    Gestionar
                  </Button>
                }
              />
              {clinics.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="Sin consultorios"
                  description="Creá el primer consultorio desde Consultorios."
                />
              ) : (
                <div className="divide-y divide-zinc-100">
                  {clinics.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 px-5 py-3">
                      <LogoImage
                        src={g.logoURL}
                        alt={g.name}
                        className="size-9 shrink-0 rounded-xl"
                        fallbackClassName="bg-brand-50 text-brand-600"
                        fallbackIcon={Building2}
                        iconClassName="size-5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-900">{g.name}</p>
                        <AdminCountBadge count={adminCounts.byClinic.get(g.id)} />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<LogIn className="size-4" />}
                        onClick={() => enterClinic(g.id)}
                      >
                        Entrar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  )
}

/** Cuenta de admins del clinic; '—' mientras carga la query de members. */
function AdminCountBadge({ count }: { count?: number }) {
  if (count == null) return <Badge tone="neutral">— admins</Badge>
  return (
    <Badge tone={count > 0 ? 'neutral' : 'amber'}>
      {count} admin{count === 1 ? '' : 's'}
    </Badge>
  )
}
