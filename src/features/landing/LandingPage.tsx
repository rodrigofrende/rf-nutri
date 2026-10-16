import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Banknote,
  ChevronDown,
  LogIn,
  Mail,
  MessageCircle,
  MonitorSmartphone,
} from 'lucide-react'
import { APP_NAME, PLATFORM_EMAIL, PLATFORM_TAGLINE, PLATFORM_WHATSAPP } from '@/config/app'
import { usePlans } from '@/hooks/usePlans'
import { useClinicPresentations } from '@/hooks/useClinicPresentation'
import { AppSwitcher, BrandLockup, LogoImage } from '@/components/ui'
import { publicClinicRoute } from '@/routes/routePaths'
import { formatCurrency } from '@/utils/format'
import { buildThemeVars, PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { cn } from '@/utils/cn'
import { mailtoLink, whatsappLink } from '@/utils/contact'
import {
  EMAIL_GENERAL_SUBJECT,
  FAQS,
  FEATURE_GROUPS,
  STEPS,
  TRUTHS,
  WHATSAPP_GENERAL_MESSAGE,
  resolveLandingPlans,
  type LandingFeature,
  type LandingStep,
} from './landingContent'
import { LandingPricing } from './LandingPricing'
import { CtaButton, LandingSection, scrollToId } from './landingUi'

/** Lift sutil en hover para las cards (features, pasos). */
const CARD_HOVER =
  'transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/10'

const CURRENT_YEAR = new Date().getFullYear()

/**
 * Landing pública de RF NUTRI en `/` para visitantes sin sesión. Look "Athletic
 * Bold" (mismo lenguaje visual que la página pública de cada clinic) con el tema
 * de la PLATAFORMA scopeado inline: el theme del tenant de un admin logueado
 * nunca la pisa. Nota de theming: NO usar text-zinc-700/800/900 acá
 * (buildThemeVars los remapea al color de texto del tema).
 *
 * `rf-tacto` apaga el recuadro gris de iOS en toda la landing (ver index.css):
 * cada tocable de acá tiene que llevar su `active:`, o queda mudo al toque.
 */
export function LandingPage() {
  const themeStyle = buildThemeVars(PLATFORM_DEFAULT_THEME) as CSSProperties
  return (
    <div style={themeStyle} className="rf-tacto min-h-full bg-zinc-950">
      <LandingView />
    </div>
  )
}

const PILL_LINK =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-transform hover:scale-[1.03] active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400'

function LandingView() {
  const { data, isError } = usePlans()
  const plans = resolveLandingPlans(data, isError)
  const priced = plans.filter((p) => !p.customPricing)
  const minPrice = priced.length > 0 ? Math.min(...priced.map((p) => p.price)) : null

  // Barra sticky: aparece al scrollear pasado el hero (patrón PublicClinicView).
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
      <div ref={heroSentinelRef} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32" />

      {/* Barra sticky (aparece al scrollear pasado el hero) */}
      <div
        className={cn(
          'sticky top-0 z-30 -mb-14 border-b border-white/10 bg-zinc-950/80 backdrop-blur transition-all duration-300',
          showBar ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0',
        )}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-6">
          <NavBarItems />
        </div>
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="rf-glow rf-halo pointer-events-none absolute -top-[25rem] left-1/2 size-[72rem] -translate-x-1/2"
        />
        {/* Barra estática de entrada: "Ingresar" visible sin scrollear (la
            sticky la releva cuando el hero sale de pantalla). */}
        <div className="relative mx-auto flex h-14 max-w-5xl items-center gap-3 px-6 pt-4">
          <NavBarItems />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 pb-14 pt-8 sm:pb-20 sm:pt-10">
          <div className="flex flex-col gap-10 @4xl:flex-row @4xl:items-start @4xl:justify-between">
            <div className="min-w-0 flex-1">
              <span className="rf-fade-up block text-xs font-semibold uppercase tracking-[0.25em] text-brand-400">
                Software de gestión para nutricionistas
              </span>

              <h1
                className="rf-fade-up mt-8 break-words font-display text-5xl uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl"
                style={{ animationDelay: '80ms' }}
              >
                Tu consulta, en su mejor versión.
              </h1>
              <div
                className="rf-fade-up mt-5 h-1.5 w-24 rounded-full bg-brand-500"
                style={{ animationDelay: '160ms' }}
              />

              <p
                className="rf-fade-up mt-6 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg"
                style={{ animationDelay: '240ms' }}
              >
                Tu consultorio completo online: ficha clínica, turnos, planes alimentarios y
                cobros. Y tus pacientes, con su plan y su progreso en su propia app.
              </p>

              <div
                className="rf-fade-up mt-8 flex flex-wrap gap-3"
                style={{ animationDelay: '320ms' }}
              >
                {PLATFORM_EMAIL && (
                  <CtaButton
                    href={mailtoLink(PLATFORM_EMAIL, EMAIL_GENERAL_SUBJECT) ?? undefined}
                    external={false}
                    primary
                    icon={<Mail className="size-4" />}
                  >
                    Quiero {APP_NAME} en mi consultorio
                  </CtaButton>
                )}
                <CtaButton href="#planes" external={false} onClick={() => scrollToId('planes')}>
                  Ver planes
                </CtaButton>
              </div>
            </div>

            <aside
              className="rf-fade-up w-full shrink-0 space-y-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 @4xl:mt-14 @4xl:w-80"
              style={{ animationDelay: '400ms' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Info rápida
              </p>
              <p className="flex items-start gap-2 text-sm text-zinc-300">
                <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-brand-400" />
                100% web: funciona en el celular, sin instalar nada.
              </p>
              <p className="flex items-start gap-2 text-sm text-zinc-300">
                <Banknote className="mt-0.5 size-4 shrink-0 text-brand-400" />
                Precios en pesos, hecho en Argentina.
              </p>
              {minPrice != null && (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Planes desde</p>
                  <p className="font-display text-3xl">
                    {formatCurrency(minPrice)}
                    <span className="font-sans text-sm text-zinc-500"> /mes</span>
                  </p>
                </div>
              )}
            </aside>
          </div>

          {/* Franja de verdades del producto (sin testimonios inventados). */}
          <div className="mt-12 flex flex-wrap gap-2">
            {TRUTHS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-16 px-6 pb-20 @4xl:space-y-20">
        {/* Funciones */}
        <LandingSection id="funciones" label="Todo tu consultorio, una sola app">
          <div className="space-y-10">
            {FEATURE_GROUPS.map((group) => (
              <div key={group.eyebrow} className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {group.eyebrow}
                </p>
                <div className="grid gap-4 @2xl:grid-cols-2 @4xl:grid-cols-4">
                  {group.features.map((f) => (
                    <FeatureCard key={f.title} feature={f} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </LandingSection>

        {/* Cómo funciona */}
        <LandingSection label="Arrancar es así de simple">
          <div className="grid gap-4 @3xl:grid-cols-3">
            {STEPS.map((step, i) => (
              <StepCard key={step.title} step={step} index={i + 1} />
            ))}
          </div>
        </LandingSection>

        {/* Nuestros clientes (prueba social antes del pricing) */}
        <ClientsSection />

        {/* Planes (precios vivos) */}
        <LandingPricing />

        {/* FAQ */}
        <LandingSection id="preguntas" label="Preguntas frecuentes">
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-white/10 bg-zinc-900">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-5 font-semibold transition-colors active:bg-white/5 [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <ChevronDown className="size-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-zinc-400">{faq.a}</p>
              </details>
            ))}
          </div>
        </LandingSection>

        {/* CTA final */}
        <section className="space-y-6 text-center">
          <h2 className="font-display text-5xl uppercase leading-[0.9] tracking-tight sm:text-7xl">
            ¿Arrancamos?
          </h2>
          <p className="mx-auto max-w-md text-base text-zinc-300">
            Contanos cómo atendés y te dejamos el consultorio andando.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {PLATFORM_EMAIL && (
              <CtaButton
                href={mailtoLink(PLATFORM_EMAIL, EMAIL_GENERAL_SUBJECT) ?? undefined}
                external={false}
                primary
                icon={<Mail className="size-4" />}
              >
                Quiero {APP_NAME} en mi consultorio
              </CtaButton>
            )}
            {PLATFORM_WHATSAPP && (
              <CtaButton
                href={whatsappLink(PLATFORM_WHATSAPP, WHATSAPP_GENERAL_MESSAGE) ?? undefined}
                icon={<MessageCircle className="size-4" />}
              >
                Escribinos por WhatsApp
              </CtaButton>
            )}
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-transform hover:scale-[1.03] hover:bg-white/10 active:scale-[0.97] active:bg-white/15 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <LogIn className="size-4" />
              Ingresar
            </Link>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-4 text-center">
          <div className="flex justify-center">
            <BrandLockup />
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500">{PLATFORM_TAGLINE}</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-zinc-400">
            <button type="button" onClick={() => scrollToId('funciones')} className="hover:text-white active:text-white">
              Funciones
            </button>
            <button type="button" onClick={() => scrollToId('planes')} className="hover:text-white active:text-white">
              Planes
            </button>
            <button type="button" onClick={() => scrollToId('preguntas')} className="hover:text-white active:text-white">
              Preguntas
            </button>
            <Link to="/login" className="hover:text-white active:text-white">
              Ingresar
            </Link>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            © {CURRENT_YEAR} {APP_NAME} · Hecho en Argentina.
          </p>
        </div>
      </footer>
    </div>
  )
}

/** Contenido de la barra de navegación (compartido entre la estática y la sticky). */
function NavBarItems() {
  return (
    <>
      <BrandLockup className="shrink-0" />
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => scrollToId('funciones')}
        className="hidden text-sm font-medium text-zinc-400 transition-colors hover:text-white active:text-white sm:block"
      >
        Funciones
      </button>
      <button
        type="button"
        onClick={() => scrollToId('planes')}
        className="hidden text-sm font-medium text-zinc-400 transition-colors hover:text-white active:text-white sm:block"
      >
        Planes
      </button>
      <AppSwitcher className="shrink-0" />
      <Link
        to="/login"
        className={cn(PILL_LINK, 'border border-white/20 text-white hover:bg-white/10 active:bg-white/15')}
      >
        <LogIn className="size-3.5" />
        Ingresar
      </Link>
      {PLATFORM_EMAIL && (
        <a
          href={mailtoLink(PLATFORM_EMAIL, EMAIL_GENERAL_SUBJECT) ?? undefined}
          className={cn(PILL_LINK, 'bg-brand-500 text-white active:bg-brand-600')}
        >
          <Mail className="size-3.5" />
          Escribinos
        </a>
      )}
    </>
  )
}

/**
 * Consultorios que ya usan la plataforma: nombre + logo desde sus perfiles
 * públicos (`publicProfiles`, world-readable — sin rules nuevas), con link al
 * micrositio de cada uno. Se oculta sola si no hay perfiles cargados.
 */
function ClientsSection() {
  const { data: profiles = [] } = useClinicPresentations()
  const clients = profiles.filter((p) => p.name)
  if (clients.length === 0) return null
  return (
    <LandingSection
      label="Consultorios que ya están"
      sub={`Nutricionistas que gestionan su día a día con ${APP_NAME}. Tocá cualquiera y mirá su página.`}
    >
      {/* Grid (no flex-wrap): cards de ancho uniforme y alineadas en mobile. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 @3xl:grid-cols-4">
        {clients.map((c) => (
          <Link
            key={c.id}
            to={publicClinicRoute(c.id)}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 transition-colors hover:border-brand-500/50 hover:bg-zinc-800 active:border-brand-500/50 active:bg-zinc-800"
          >
            <LogoImage
              src={c.logoURL}
              alt={c.name}
              className="size-10 shrink-0 rounded-xl"
              fallbackClassName="bg-brand-500"
              iconClassName="size-5"
            />
            <span className="min-w-0 flex-1 truncate font-semibold text-white">{c.name}</span>
            <ArrowRight className="size-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400" />
          </Link>
        ))}
      </div>
    </LandingSection>
  )
}

function FeatureCard({ feature }: { feature: LandingFeature }) {
  const Icon = feature.icon
  return (
    <div className={cn('flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-5', CARD_HOVER)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
        <Icon className="size-4" />
      </span>
      <p className="font-semibold text-white">{feature.title}</p>
      <p className="text-sm leading-relaxed text-zinc-400">{feature.body}</p>
    </div>
  )
}

function StepCard({ step, index }: { step: LandingStep; index: number }) {
  const Icon = step.icon
  return (
    <div className={cn('flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-5', CARD_HOVER)}>
      <div className="flex items-center justify-between">
        <span className="font-display text-5xl leading-none text-brand-500/40">{index}</span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="font-semibold text-white">{step.title}</p>
      <p className="text-sm leading-relaxed text-zinc-400">{step.body}</p>
    </div>
  )
}
