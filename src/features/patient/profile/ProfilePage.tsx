import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Copy, KeyRound } from 'lucide-react'
import { dateInputToTimestamp } from '@/utils/dates'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useToastAction } from '@/hooks/useToastAction'
import { useMember, useUpdateMemberProfile } from '@/hooks/useMembers'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DateInput,
  FormField,
  FullPageSpinner,
  Heading,
  IconButton,
  Input,
  Text,
  Tooltip,
} from '@/components/ui'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { toDateInput } from '@/utils/format'
import { STATUS_LABEL } from '@/utils/roles'
import { ROUTES } from '@/routes/routePaths'
import { MY_PROFILE_HELP } from '@/content/help'

const schema = z.object({
  fullName: z.string().min(2, 'Ingresá tu nombre'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

/**
 * Perfil del paciente. SOLO datos personales + seguridad de acceso.
 * Los pagos viven en "Mis pagos" y la ficha clínica la maneja el consultorio:
 * acá el paciente edita únicamente lo que es suyo (nombre, teléfono, nacimiento).
 */
export function ProfilePage() {
  const { activeClinicId, activeMembership } = useTenant()
  const clinicId = activeClinicId as string
  const memberId = activeMembership?.memberId as string
  const navigate = useNavigate()
  const { notify } = useToast()
  const run = useToastAction()
  const [copiedEmail, setCopiedEmail] = useState(false)

  const { data: member, isLoading } = useMember(clinicId, memberId)
  const updateProfile = useUpdateMemberProfile(clinicId, memberId)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      fullName: member?.fullName ?? '',
      phone: member?.phone ?? '',
      birthDate: toDateInput(member?.birthDate),
    },
  })

  if (isLoading) {
    return (
      <AppLayout title="Mi perfil" help={MY_PROFILE_HELP} helpTitle="Cómo funciona tu perfil">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  const onSubmit = (v: FormValues) =>
    run(
      () =>
        updateProfile.mutateAsync({
          fullName: v.fullName,
          phone: v.phone,
          birthDate: dateInputToTimestamp(v.birthDate),
        }),
      { success: 'Datos actualizados', error: 'No se pudieron guardar los cambios' },
    )

  const accessEmail = member?.loginEmail || member?.email || ''
  const copyEmail = async () => {
    if (!accessEmail) return
    await navigator.clipboard.writeText(accessEmail)
    setCopiedEmail(true)
    notify('Email copiado', 'success')
    window.setTimeout(() => setCopiedEmail(false), 1500)
  }

  return (
    <AppLayout title="Mi perfil" help={MY_PROFILE_HELP} helpTitle="Cómo funciona tu perfil">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
          <div className="space-y-5 lg:col-span-1">
            <Card>
              <CardBody>
                <div className="flex flex-col items-center text-center">
                  <Avatar name={member?.fullName ?? '?'} src={member?.photoURL} size="lg" />
                  <Heading variant="card" className="mt-3 text-lg">
                    {member?.fullName}
                  </Heading>
                  <Text variant="caption" className="mt-1 break-all">
                    {member?.email}
                  </Text>
                </div>
                {member && (
                  <div className="mt-5 border-t border-zinc-100 pt-5">
                    <InfoGrid
                      items={[
                        {
                          label: 'Estado',
                          value: (
                            <Badge tone={member.status === 'active' ? 'green' : 'amber'}>
                              {STATUS_LABEL[member.status]}
                            </Badge>
                          ),
                        },
                      ]}
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <Card>
              <CardHeader
                title="Seguridad"
                subtitle="Tu contraseña no se muestra ni se guarda visible por seguridad."
                action={
                  <Tooltip text="Cambiar contraseña">
                    <IconButton
                      tone="brand"
                      className="border border-brand-100 bg-brand-50"
                      label="Cambiar contraseña"
                      icon={<KeyRound className="size-4" />}
                      onClick={() =>
                        navigate(`${ROUTES.SET_PASSWORD}?email=${encodeURIComponent(accessEmail)}&mode=change`)
                      }
                    />
                  </Tooltip>
                }
              />
              <CardBody>
                <div className="space-y-4">
                  <InfoGrid
                    items={[
                      {
                        label: 'Email de acceso',
                        value: (
                          <span className="inline-flex max-w-full items-center gap-2">
                            <span className="min-w-0 break-all">{accessEmail}</span>
                            <Tooltip text={copiedEmail ? 'Copiado' : 'Copiar email'}>
                              <IconButton
                                size="sm"
                                tone="brand"
                                label="Copiar email de acceso"
                                icon={
                                  copiedEmail ? (
                                    <Check className="size-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="size-4" />
                                  )
                                }
                                onClick={copyEmail}
                                className="shrink-0"
                              />
                            </Tooltip>
                          </span>
                        ),
                      },
                      {
                        label: 'Estado',
                        value: (
                          <Badge tone={member?.authStatus === 'password_change_required' ? 'amber' : 'green'}>
                            {member?.authStatus === 'password_change_required'
                              ? 'Cambio requerido'
                              : 'Contraseña activa'}
                          </Badge>
                        ),
                      },
                    ]}
                  />
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
                    Si olvidás totalmente tu contraseña, comunicate con tu consultorio. En esta versión el cambio se hace estando logueado.
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Datos personales" subtitle="Mantené tu información al día" />
              <CardBody>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <FormField label="Nombre completo" error={errors.fullName?.message} required>
                    <Input {...register('fullName')} invalid={!!errors.fullName} />
                  </FormField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Teléfono">
                      <Input {...register('phone')} />
                    </FormField>
                    <FormField label="Fecha de nacimiento">
                      <DateInput {...register('birthDate')} />
                    </FormField>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" loading={updateProfile.isPending} disabled={!isDirty}>
                      Guardar cambios
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
