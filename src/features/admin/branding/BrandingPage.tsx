import { useRef, useState, type CSSProperties } from 'react'
import { Upload } from 'lucide-react'
import type { ClinicTheme } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useClinic, useUpdateClinicBranding } from '@/hooks/useClinic'
import { useToastAction } from '@/hooks/useToastAction'
import { BRANDING_PRESETS, buildThemeVars, PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { fileToLogoDataUrl } from '@/utils/image'
import { isSafeImageSrc } from '@/utils/url'
import { toDate } from '@/utils/format'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, CardBody, CardHeader, FormField, FullPageSpinner, Heading, LogoImage, Text } from '@/components/ui'
import { cn } from '@/utils/cn'

// Límite de cambios de logo, espejado en firestore.rules (logoLimitOk).
const LOGO_CHANGES_PER_DAY = 3
const LOGO_WINDOW_MS = 24 * 60 * 60 * 1000

const formatResetTime = (d: Date) =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)

export function BrandingPage() {
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const run = useToastAction()
  const { data: clinic, isLoading } = useClinic(clinicId)
  const save = useUpdateClinicBranding(clinicId)

  const [theme, setTheme] = useState<ClinicTheme | null>(null)
  const [logoURL, setLogoURL] = useState<string | null>(null)
  const [processingLogo, setProcessingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (isLoading || !clinic) {
    return (
      <AppLayout
        title="Marca"
        subtitle="Personalizá el logo y los colores que ven tus pacientes en la app."
      >
        <FullPageSpinner />
      </AppLayout>
    )
  }

  const savedTheme = clinic.theme ?? PLATFORM_DEFAULT_THEME
  const current = theme ?? savedTheme
  const currentLogo = logoURL ?? clinic.logoURL ?? ''

  const applyPreset = (preset: ClinicTheme) => setTheme({ ...preset })

  // Ventana de rate-limit del logo (espejo de lo que validan las firestore.rules).
  const windowStart = toDate(clinic.logoWindowStart)
  // Lectura del reloj solo para la leyenda y el estado de los botones: al guardar
  // se recalcula fresco, y la validación real la aplican las firestore.rules.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now()
  const windowActive = !!windowStart && nowMs - windowStart.getTime() < LOGO_WINDOW_MS
  const logoChangesUsed = windowActive ? (clinic.logoChangeCount ?? 0) : 0
  const logoChangesLeft = Math.max(0, LOGO_CHANGES_PER_DAY - logoChangesUsed)
  const logoBlocked = logoChangesLeft === 0
  const logoResetAt = windowStart ? new Date(windowStart.getTime() + LOGO_WINDOW_MS) : null
  const logoChanged = currentLogo !== (clinic.logoURL ?? '')

  const handleLogoFile = async (file?: File) => {
    if (!file) return
    setProcessingLogo(true)
    try {
      await run(async () => setLogoURL(await fileToLogoDataUrl(file)), {
        error: 'No se pudo procesar la imagen.',
      })
    } finally {
      setProcessingLogo(false)
    }
  }

  const handleSave = () =>
    run(
      async () => {
        if (!logoChanged) {
          await save.mutateAsync({ theme: current })
          return
        }
        if (currentLogo && !isSafeImageSrc(currentLogo)) {
          throw new Error('El logo debe ser una imagen válida. Volvé a subirla.')
        }
        // Recalcular la ventana con el reloj actual (la de render puede estar vieja).
        const activeNow = !!windowStart && Date.now() - windowStart.getTime() < LOGO_WINDOW_MS
        const usedNow = activeNow ? (clinic.logoChangeCount ?? 0) : 0
        if (usedNow >= LOGO_CHANGES_PER_DAY) {
          throw new Error(
            `Alcanzaste el límite de ${LOGO_CHANGES_PER_DAY} cambios de logo por día.` +
              (logoResetAt ? ` Podés volver a cambiarlo el ${formatResetTime(logoResetAt)}.` : ''),
          )
        }
        // El logo viaja solo si cambió: los guardados de colores no consumen el límite.
        // `null` borra el campo (deleteField); nunca escribir `""` (rompe firestore.rules).
        await save.mutateAsync({
          theme: current,
          logoURL: currentLogo || null,
          logoChangeCount: usedNow + 1,
          ...(activeNow ? {} : { startLogoWindow: true }),
        })
      },
      {
        success: 'Branding actualizado',
        error: 'No se pudo guardar el branding',
      },
    )

  const previewStyle = buildThemeVars(current) as CSSProperties

  return (
    <AppLayout
      title="Marca"
      subtitle="Personalizá el logo y los colores que ven tus pacientes en la app."
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Identidad del consultorio"
            subtitle="Logo, colores y paletas sugeridas para tu marca."
          />
          <CardBody className="space-y-5">
            <FormField label="Logo" hint="Imagen cuadrada; se muestra en el menú lateral.">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-zinc-200 bg-zinc-50/60 px-3 py-2">
                  <LogoImage
                    src={currentLogo}
                    alt="Logo del consultorio"
                    className="size-9 shrink-0 rounded-lg"
                    iconClassName="size-4"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-600">
                    {currentLogo ? 'Imagen cargada' : 'Sin logo'}
                  </span>
                  {currentLogo && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={logoBlocked}
                      onClick={() => setLogoURL('')}
                    >
                      Quitar
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    leftIcon={<Upload className="size-3.5" />}
                    loading={processingLogo}
                    disabled={logoBlocked}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Subir imagen
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleLogoFile(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </div>
                {logoBlocked && logoResetAt ? (
                  <p className="text-xs font-medium text-amber-600">
                    Alcanzaste el límite de {LOGO_CHANGES_PER_DAY} cambios de logo por día. Podés
                    volver a cambiarlo el {formatResetTime(logoResetAt)}.
                  </p>
                ) : windowActive && logoChangesUsed > 0 ? (
                  <p className="text-xs text-zinc-500">
                    Te {logoChangesLeft === 1 ? 'queda' : 'quedan'} {logoChangesLeft}{' '}
                    {logoChangesLeft === 1 ? 'cambio' : 'cambios'} de logo hoy.
                  </p>
                ) : null}
              </div>
            </FormField>

            <fieldset>
              <Text variant="label" as="legend" className="mb-2">
                Tema
              </Text>
              <p className="mb-3 text-xs text-zinc-500">
                Elegí una paleta. Todas están pensadas para buen contraste en la app, en tu página
                pública y con la marca.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BRANDING_PRESETS.map((preset) => {
                  const selected = current.accent.toLowerCase() === preset.theme.accent.toLowerCase()
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.theme)}
                      aria-pressed={selected}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                        selected
                          ? 'border-brand-500 ring-2 ring-brand-500'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50',
                      )}
                    >
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/5"
                        style={{ backgroundColor: preset.theme.background }}
                        aria-hidden
                      >
                        <span className="size-4 rounded-full" style={{ backgroundColor: preset.theme.accent }} />
                      </span>
                      <span className="truncate text-zinc-700">{preset.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="flex justify-end border-t border-zinc-100 pt-3">
              <Button loading={save.isPending} onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </CardBody>
        </Card>

        <div>
          <Text variant="label" className="mb-2">
            Vista previa
          </Text>
          <p className="mb-3 text-xs text-zinc-500">
            Los cambios se aplican en vivo mientras editás. Al salir sin guardar, vuelve el tema
            guardado.
          </p>
          <div
            style={previewStyle}
            className="space-y-4 rounded-[var(--radius-card)] border border-zinc-200 bg-surface-muted p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <LogoImage src={currentLogo} alt="Logo" className="size-9 rounded-xl" iconClassName="size-5" />
              <Heading variant="page">{clinic.name}</Heading>
            </div>

            <Card className="p-5">
              <Heading variant="card">Tarjeta de ejemplo</Heading>
              <Text variant="caption" className="mt-1">
                Así se ven los contenedores con tus colores.
              </Text>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm">Acción</Button>
                <Button size="sm" variant="secondary">
                  Secundaria
                </Button>
                <Badge tone="brand">Etiqueta</Badge>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

