import { Building2 } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { useClinicPresentation } from '@/hooks/useClinicPresentation'
import { AppLayout } from '@/components/layout/AppLayout'
import { EmptyState, FullPageSpinner } from '@/components/ui'
import { ClinicPresentation } from '@/features/clinic-presentation/ClinicPresentation'
import { MY_CONTACT_HELP } from '@/content/help'

/** Vista de solo lectura de la presentación del clinic para el paciente logueado. */
export function MyClinicMemberPage() {
  const { activeClinicId, activeMembership } = useTenant()
  const clinicId = activeClinicId ?? ''
  const { data, isLoading } = useClinicPresentation(clinicId)
  const clinicName = data?.name || activeMembership?.clinicName || 'El consultorio'
  // Solo campos que existen en la presentación de RF-NUTRI (sin restos de la app de gym).
  const hasContent = Boolean(
    data &&
      (data.description ||
        data.whatsapp ||
        data.email ||
        data.address ||
        data.openingHours ||
        data.videos?.length ||
        data.links?.length ||
        data.tariffs?.length),
  )

  return (
    <AppLayout
      title={clinicName}
      subtitle="Información, horarios y cómo contactarlos."
      help={MY_CONTACT_HELP}
      helpTitle="Cómo funciona esta pantalla"
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : data && hasContent ? (
        <div className="mx-auto max-w-2xl">
          <ClinicPresentation data={data} clinicName={clinicName} />
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Todavía no hay información"
          description="Todavía no cargaron su presentación. Volvé a visitarla más adelante."
        />
      )}
    </AppLayout>
  )
}
