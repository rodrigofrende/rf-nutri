import { Clock, ExternalLink, Mail, MapPin, MessageCircle, PlayCircle } from 'lucide-react'
import type { ClinicPresentation as ClinicPresentationData, PublicTariff } from '@/types'
import { Button, Card, CardBody, Heading, LogoImage, Text } from '@/components/ui'
import { parseVideoUrl, type VideoEmbed } from '@/utils/video'
import { mailtoLink, whatsappLink } from '@/utils/contact'
import { resolvePresentation } from '@/utils/presentation'
import { linkIcon } from '@/utils/links'
import { tariffIconMeta } from '@/utils/tariffIcons'
import { formatCurrency } from '@/utils/format'
import { APP_NAME } from '@/config/app'

/**
 * Vista de presentación del consultorio. Componente presentacional puro (sin hooks
 * de datos ni router): lo reusan la página pública, la del paciente y la vista previa
 * del admin. Cada bloque se muestra solo si su dato existe. Sanea las URLs antes
 * de renderizar (defensa en profundidad ante datos maliciosos).
 */
export function ClinicPresentation({
  data,
  clinicName,
  hideHeader = false,
}: {
  data: Partial<ClinicPresentationData>
  clinicName: string
  /** La página pública usa su propio hero; oculta el header interno para no duplicarlo. */
  hideHeader?: boolean
}) {
  const { videos, links } = resolvePresentation(data)
  const tariffs = (data.tariffs ?? []).filter((t) => t && t.name && typeof t.price === 'number')
  const wa = whatsappLink(data.whatsapp, `Hola, quiero agendar una consulta en ${clinicName}`)
  const mail = mailtoLink(data.email, `Consulta sobre ${clinicName}`)
  const hasContact = wa || mail || data.address || data.openingHours

  return (
    <div className="@container space-y-6">
      {!hideHeader && (
        <div className="flex items-center gap-3">
          <LogoImage src={data.logoURL} alt={clinicName} className="size-12 rounded-2xl" />
          <div className="min-w-0">
            <Heading variant="display">{clinicName}</Heading>
            <p className="text-xs font-medium text-brand-700">by {APP_NAME}</p>
          </div>
        </div>
      )}

      {data.description && (
        <Card>
          <CardBody>
            <Text className="whitespace-pre-line">{data.description}</Text>
          </CardBody>
        </Card>
      )}

      {videos.length > 0 && (
        <div className="space-y-4">
          {videos.map((url, i) => {
            const video = parseVideoUrl(url)
            return video ? <VideoBlock key={`${url}-${i}`} video={video} /> : null
          })}
        </div>
      )}

      {tariffs.length > 0 && (
        <div className="space-y-3">
          <Heading variant="card">Servicios</Heading>
          <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
            {tariffs.map((tariff) => (
              <PublicTariffCard key={tariff.id} tariff={tariff} />
            ))}
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="grid gap-2 @2xl:grid-cols-2">
          {links.map((link, i) => {
            const Icon = linkIcon(link.url)
            return (
              <a
                key={`${link.url}-${i}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-zinc-200 bg-surface px-4 py-3 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">
                  {link.label}
                </span>
                <ExternalLink className="size-4 shrink-0 text-zinc-400" />
              </a>
            )
          })}
        </div>
      )}

      {hasContact && (
        <Card>
          <CardBody className="space-y-4">
            <Heading variant="card">Contacto</Heading>

            {(wa || mail) && (
              <div className="flex flex-wrap gap-2">
                {wa && (
                  <Button
                    leftIcon={<MessageCircle className="size-4" />}
                    onClick={() => window.open(wa, '_blank', 'noopener,noreferrer')}
                  >
                    WhatsApp
                  </Button>
                )}
                {mail && (
                  <Button
                    variant="secondary"
                    leftIcon={<Mail className="size-4" />}
                    onClick={() => {
                      window.location.href = mail
                    }}
                  >
                    Email
                  </Button>
                )}
              </div>
            )}

            {(data.address || data.openingHours) && (
              <div className="space-y-2 text-sm text-zinc-600">
                {data.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-zinc-400" />
                    {data.address}
                  </p>
                )}
                {data.openingHours && (
                  <p className="flex items-center gap-2">
                    <Clock className="size-4 shrink-0 text-zinc-400" />
                    {data.openingHours}
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function VideoBlock({ video }: { video: VideoEmbed }) {
  if (video.kind === 'youtube') {
    return (
      <Card>
        <CardBody>
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-100">
            <iframe
              src={video.embedUrl}
              title="Video del consultorio"
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </CardBody>
      </Card>
    )
  }

  if (video.kind === 'instagram' && video.embedUrl) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
            <iframe
              src={video.embedUrl}
              title="Video del consultorio en Instagram"
              className="h-[560px] w-full"
              loading="lazy"
              scrolling="no"
              allowFullScreen
            />
          </div>
          <a
            href={video.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            <PlayCircle className="size-4" />
            Ver en Instagram
          </a>
        </CardBody>
      </Card>
    )
  }

  const href = video.kind === 'instagram' ? video.permalink : video.url
  const label = video.kind === 'instagram' ? 'Ver video en Instagram' : 'Ver video'

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="transition-colors hover:bg-zinc-50">
        <CardBody className="flex items-center gap-3">
          <PlayCircle className="size-6 shrink-0 text-brand-600" />
          <Text variant="label">{label}</Text>
        </CardBody>
      </Card>
    </a>
  )
}

function PublicTariffCard({ tariff }: { tariff: PublicTariff }) {
  const Icon = tariffIconMeta(tariff.icon).icon
  return (
    <Card className="h-full">
      <CardBody className="flex h-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-800">{tariff.name}</p>
          </div>
        </div>
        {tariff.description && <Text variant="caption">{tariff.description}</Text>}
        <p className="mt-auto pt-1 text-lg font-bold text-zinc-900">
          {formatCurrency(tariff.price)}
        </p>
      </CardBody>
    </Card>
  )
}
