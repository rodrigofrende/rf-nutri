import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Primitivas compartidas de la landing (look "Athletic Bold" de PublicClinicView).
 * Locales a la landing: el ui-kit de la app es light-only.
 */

/** Sección con la regla de acento + título Anton, con anchor scrolleable. */
export function LandingSection({
  id,
  label,
  sub,
  children,
}: {
  id?: string
  label: string
  sub?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-brand-500" />
          <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{label}</h2>
        </div>
        {sub && <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{sub}</p>}
      </div>
      {children}
    </section>
  )
}

/** CTA pill: <a> para links externos/rutas o <button> con onClick para anchors. */
export function CtaButton({
  href,
  onClick,
  primary,
  icon,
  external = true,
  children,
}: {
  href?: string
  onClick?: () => void
  primary?: boolean
  icon?: ReactNode
  /** false para links internos (sin target _blank). */
  external?: boolean
  children: ReactNode
}) {
  const className = cn(
    'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
    primary
      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
      : 'border border-white/20 text-white hover:bg-white/10',
  )
  const content = (
    <>
      {icon}
      {children}
      {primary && <ArrowRight className="size-4" />}
    </>
  )
  if (href) {
    return (
      <a
        href={href}
        className={className}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        onClick={
          onClick
            ? (e) => {
                e.preventDefault()
                onClick()
              }
            : undefined
        }
      >
        {content}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

/** Scroll suave a una sección con anchor (fallback: el href queda navegable). */
// eslint-disable-next-line react-refresh/only-export-components
export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
