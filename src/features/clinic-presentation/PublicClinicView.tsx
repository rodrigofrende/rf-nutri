import { createElement, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, PlayCircle } from 'lucide-react'
import type { ClinicLink, ClinicPresentation as ClinicPresentationData, PublicTariff } from '@/types'
import { BrandLockup, LogoImage } from '@/components/ui'
import { parseVideoUrl } from '@/utils/video'
import { mailtoLink, whatsappLink } from '@/utils/contact'
import { resolvePresentation } from '@/utils/presentation'
import { linkIcon } from '@/utils/links'
import { tariffIconMeta } from '@/utils/tariffIcons'
import { formatCurrency } from '@/utils/format'
import { APP_NAME, PLATFORM_TAGLINE } from '@/config/app'
import { cn } from '@/utils/cn'

const CURRENT_YEAR = new Date().getFullYear()

/**
 * Landing pública "Athletic Bold": fondo oscuro, tipografía display gigante y el
 * color de marca del consultorio como acento. Es presentacional pura — la usan la
 * página pública (`/n/:clinicId`) y la vista previa del admin, para que el admin vea
 * lo que ven los prospectos.
 *
 * Nota de theming: `buildThemeVars` remapea `--color-zinc-700/800/900` al color
 * de TEXTO del clinic, así que acá NO usamos esos tonos (quedarían oscuros sobre
 * fondo oscuro). Usamos `white`, `zinc-300/400/500`, `zinc-900/950` (no remapeados)
 * y `brand-*` (que sí sigue el acento del clinic, justo lo que queremos que explote).
 */
export function PublicClinicView({
  data,
  clinicName,
}: {
  data: Partial<ClinicPresentationData>
  clinicName: string
}) {
  const { videos, links } = resolvePresentation(data)
  const tariffs = (data.tariffs ?? []).filter((t) => t && t.name && typeof t.price === 'number')
  const wa = whatsappLink(data.whatsapp, `Hola, quiero agendar una consulta en ${clinicName}`)
  const mail = mailtoLink(data.email, `Consulta sobre ${clinicName}`)
  const minPrice = tariffs.length ? Math.min(...tariffs.map((t) => t.price)) : null
  const hasQuickInfo = Boolean(
    data.address || data.openingHours || data.whatsapp || data.email || minPrice != null,
  )

  // Videos separados por formato: los 16:9 (YouTube) y los verticales (Instagram)
  // van en grillas distintas para que cada fila tenga alturas coherentes.
  const parsedVideos = videos
    .map((url) => ({ url, video: parseVideoUrl(url) }))
    .filter((v) => v.video != null)
  const wideVideos = parsedVideos.filter((v) => v.video?.kind === 'youtube')
  const tallVideos = parsedVideos.filter((v) => v.video?.kind !== 'youtube')

  // Si el consultorio no cargó contenido extra, el contenedor de secciones no se
  // renderiza: evita ~80px de padding muerto entre el hero y el footer.
  const hasSections = parsedVideos.length > 0 || tariffs.length > 0 || links.length > 0

  // La barra sticky aparece recién al scrollear pasado el inicio del hero (el
  // sentinel invisible sale del viewport). Con IntersectionObserver funciona
  // igual en la página real y embebida en las previews del admin.
  const [showBar, setShowBar] = useState(false)
  const heroSentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = heroSentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="@container relative min-h-full bg-zinc-950 text-white">
      {/* Sentinel invisible: mientras esta franja superior está en pantalla, la
          barra sticky permanece oculta (el hero ya muestra la marca). */}
      <div ref={heroSentinelRef} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32" />

      {/* Barra sticky: marca + CTA siempre a mano; aparece al scrollear. El -mb
          compensa su alto para que oculta no deje una franja vacía sobre el hero. */}
      <div
        className={cn(
          'sticky top-0 z-30 -mb-14 border-b border-white/10 bg-zinc-950/80 backdrop-blur transition-all duration-300',
          showBar ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0',
        )}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-6">
          <LogoImage
            src={data.logoURL}
            alt={clinicName}
            className="size-8 shrink-0 rounded-lg"
            fallbackClassName="bg-brand-500"
            iconClassName="size-4"
          />
          <span className="min-w-0 flex-1 truncate font-display text-lg uppercase tracking-wide">
            {clinicName}
          </span>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </a>
          )}
        </div>
      </div>

      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="rf-halo pointer-events-none absolute -top-[25rem] left-1/2 size-[72rem] -translate-x-1/2"
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-14 pt-8 sm:pb-20 sm:pt-10">
          <div className="flex flex-col gap-10 @4xl:flex-row @4xl:items-start @4xl:justify-between">
            <div className="min-w-0 flex-1">
              {/* Lockup de marca: en containers angostos va apilado (el nombre
                  gigante no comparte fila sin envolver feo); desde @2xl el logo
                  acompaña al nombre en la misma fila, centrado verticalmente
                  aunque el nombre ocupe varias líneas. Variantes @ para que la
                  preview angosta del admin siga apilada en viewports anchos. */}
              <div className="flex flex-col gap-6 @2xl:flex-row @2xl:items-center @2xl:gap-8">
                <LogoImage
                  src={data.logoURL}
                  alt={clinicName}
                  className="size-24 shrink-0 rounded-2xl ring-1 ring-white/15 @2xl:size-32"
                  iconClassName="size-10 @2xl:size-14"
                  fallbackClassName="bg-brand-500 ring-0"
                />
                <div className="min-w-0">
                  <h1 className="break-words font-display text-6xl uppercase leading-[0.85] tracking-tight sm:text-8xl">
                    {clinicName}
                  </h1>
                  <div className="mt-5 h-1.5 w-24 rounded-full bg-brand-500" />
                </div>
              </div>

              {data.description && (
                <p className="mt-6 max-w-xl whitespace-pre-line text-base leading-relaxed text-zinc-300 sm:text-lg">
                  {data.description}
                </p>
              )}

              {(wa || mail) && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {wa && (
                    <CtaButton href={wa} primary icon={<MessageCircle className="size-4" />}>
                      Quiero mi consulta
                    </CtaButton>
                  )}
                  {mail && (
                    <CtaButton href={mail} icon={<Mail className="size-4" />}>
                      Email
                    </CtaButton>
                  )}
                </div>
              )}
            </div>

            {hasQuickInfo && (
              // mt-6 ≈ alinea el borde superior con el nombre (centrado contra
              // el logo de 128px) ahora que el lockup va en fila.
              <aside className="w-full shrink-0 space-y-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 @4xl:mt-6 @4xl:w-80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Info rápida
                </p>
                {data.address && (
                  <p className="flex items-start gap-2 text-sm text-zinc-300">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-brand-400" />
                    {data.address}
                  </p>
                )}
                {data.openingHours && (
                  <p className="flex items-start gap-2 text-sm text-zinc-300">
                    <Clock className="mt-0.5 size-4 shrink-0 text-brand-400" />
                    {data.openingHours}
                  </p>
                )}
                {wa && data.whatsapp && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
                  >
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-400" />
                    {data.whatsapp}
                  </a>
                )}
                {mail && data.email && (
                  <a
                    href={mail}
                    className="flex items-start gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
                  >
                    <Mail className="mt-0.5 size-4 shrink-0 text-brand-400" />
                    <span className="min-w-0 break-all">{data.email}</span>
                  </a>
                )}
                {minPrice != null && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Consultas desde</p>
                    <p className="font-display text-3xl">{formatCurrency(minPrice)}</p>
                  </div>
                )}
              </aside>
            )}
          </div>
        </div>
      </header>

      {hasSections && (
      <div className="mx-auto max-w-5xl space-y-16 px-6 pb-20 @4xl:space-y-20">
        {parsedVideos.length > 0 && (
          <Section label="Conocé el consultorio">
            {/* Variantes @: responden al ancho del contenedor, así la preview
                angosta del admin queda en 1 columna aunque el viewport sea ancho. */}
            <div className="space-y-5">
              {wideVideos.length > 0 && (
                <div
                  className={cn(
                    'grid gap-5',
                    wideVideos.length > 1 && '@2xl:grid-cols-2 @2xl:items-start',
                  )}
                >
                  {wideVideos.map(({ url }, i) => (
                    <PublicVideo key={`${url}-${i}`} url={url} />
                  ))}
                </div>
              )}
              {tallVideos.length > 0 && (
                <div className="grid gap-5 @lg:grid-cols-2 @4xl:grid-cols-3">
                  {tallVideos.map(({ url }, i) => (
                    <PublicVideo key={`${url}-${i}`} url={url} />
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        {tariffs.length > 0 && (
          <Section label="Servicios">
            <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
              {tariffs.map((tariff) => (
                <PublicTariffCard key={tariff.id} tariff={tariff} />
              ))}
            </div>
          </Section>
        )}

        {links.length > 0 && (
          <Section label="Links">
            <div className="grid gap-3 @2xl:grid-cols-2">
              {links.map((link, i) => (
                <PublicLinkRow key={`${link.url}-${i}`} link={link} />
              ))}
            </div>
          </Section>
        )}
      </div>
      )}

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="space-y-2 text-center">
            <div className="flex justify-center">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${APP_NAME} — conocé la plataforma`}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 transition-opacity hover:opacity-80"
              >
                by
                <BrandLockup variant="onDark" />
              </a>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-600">{PLATFORM_TAGLINE}</p>
            <p className="text-[11px] leading-relaxed text-zinc-600">
              © {CURRENT_YEAR} {clinicName} · Todos los derechos reservados. Precios, horarios y
              promociones sujetos a cambios.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-brand-500" />
        <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{label}</h2>
      </div>
      {children}
    </section>
  )
}

function CtaButton({
  href,
  primary,
  icon,
  children,
}: {
  href: string
  primary?: boolean
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
        primary
          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
          : 'border border-white/20 text-white hover:bg-white/10',
      )}
    >
      {icon}
      {children}
      {primary && <ArrowRight className="size-4" />}
    </a>
  )
}

function PublicVideo({ url }: { url: string }) {
  const video = parseVideoUrl(url)
  if (!video) return null

  if (video.kind === 'youtube') {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
        <iframe
          src={video.embedUrl}
          title="Video del consultorio"
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (video.kind === 'instagram' && video.embedUrl) {
    return (
      <div className="space-y-3">
        <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
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
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300"
        >
          <PlayCircle className="size-4" />
          Ver en Instagram
        </a>
      </div>
    )
  }

  const href = video.kind === 'instagram' ? video.permalink : video.url
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800"
    >
      <PlayCircle className="size-6 shrink-0 text-brand-400" />
      <span className="font-semibold">Ver video</span>
    </a>
  )
}

function PublicTariffCard({ tariff }: { tariff: PublicTariff }) {
  const Icon = tariffIconMeta(tariff.icon).icon
  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{tariff.name}</p>
        </div>
      </div>
      {tariff.description && <p className="text-sm text-zinc-400">{tariff.description}</p>}
      <p className="mt-auto pt-2 font-display text-3xl">{formatCurrency(tariff.price)}</p>
    </div>
  )
}

function PublicLinkRow({ link }: { link: ClinicLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-5 py-4 transition-colors hover:border-brand-500/50 hover:bg-zinc-800"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
        {createElement(linkIcon(link.url), { className: 'size-4' })}
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold text-white">{link.label}</span>
      <ArrowRight className="size-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400" />
    </a>
  )
}
