import {
  Apple,
  Check,
  Mail,
  NotebookPen,
  Palette,
  Sparkles,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { SubscriptionPlan } from '@/types'
import { PLATFORM_EMAIL } from '@/config/app'
import { usePlans } from '@/hooks/usePlans'
import { formatCurrency } from '@/utils/format'
import { diaryCapabilityLabel, limitLabel, whiteLabelLabel } from '@/utils/plans'
import { cn } from '@/utils/cn'
import { mailtoLink } from '@/utils/contact'
import {
  EMAIL_PLAN_HELP_SUBJECT,
  emailPlanSubject,
  planCtaLabel,
  resolveLandingPlans,
} from './landingContent'
import { CtaButton, LandingSection } from './landingUi'

/** Sección de planes: precios vivos desde `plans` con fallback estático. */
export function LandingPricing() {
  const { data, isLoading, isError } = usePlans()
  const plans = resolveLandingPlans(data, isError)
  // Fallback visual: si ningún plan viene marcado, destacar el del medio.
  const highlightedId = plans.find((p) => p.highlighted)?.id ?? plans[1]?.id

  return (
    <LandingSection
      id="planes"
      label="Planes que crecen con tu consultorio"
      sub="Sin costos ocultos ni letra chica. Cambiás de plan cuando tu consultorio lo pide."
    >
      {isLoading ? (
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-2xl border border-white/10 bg-zinc-900" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} featured={plan.id === highlightedId} />
          ))}
        </div>
      )}

      <div className="space-y-1 text-sm text-zinc-500">
        <p>Precios en pesos argentinos, por mes, por consultorio. Tus pacientes no pagan nada por usar la app.</p>
        {PLATFORM_EMAIL && (
          <p>
            ¿No sabés cuál va con tu consultorio?{' '}
            <a
              href={mailtoLink(PLATFORM_EMAIL, EMAIL_PLAN_HELP_SUBJECT) ?? undefined}
              className="font-semibold text-brand-400 hover:text-brand-300"
            >
              Escribinos y lo vemos juntos.
            </a>
          </p>
        )}
      </div>
    </LandingSection>
  )
}

function PricingCard({ plan, featured }: { plan: SubscriptionPlan; featured: boolean }) {
  return (
    <div
      className={cn(
        'relative flex h-full flex-col gap-4 rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/10',
        featured
          ? 'border-brand-500 bg-zinc-900 shadow-lg shadow-brand-500/20'
          : plan.customPricing
            ? // Tratamiento premium para el plan a medida: degradé sutil de marca.
              'border-white/20 bg-gradient-to-b from-zinc-900 to-brand-500/15'
            : 'border-white/10 bg-zinc-900',
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          Recomendado
        </span>
      )}
      {!featured && plan.customPricing && (
        <span className="absolute -top-3 left-6 rounded-full border border-brand-400/60 bg-zinc-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-300">
          A medida
        </span>
      )}
      <p className="flex items-center gap-2 font-display text-xl uppercase tracking-wide">
        {plan.customPricing && <Sparkles className="size-5 shrink-0 text-brand-400" />}
        {plan.name}
      </p>
      {plan.customPricing ? (
        <div>
          <p className="font-display text-4xl uppercase">Hablemos</p>
          <p className="mt-1 text-xs text-zinc-500">precio según el tamaño de tu equipo</p>
        </div>
      ) : (
        <p className="font-display text-4xl">
          {formatCurrency(plan.price)}
          <span className="font-sans text-sm text-zinc-500"> /mes</span>
        </p>
      )}

      {/* Límites vivos del plan (salen del documento, no del copy de features). */}
      <ul className="space-y-1.5 border-t border-white/10 pt-4 text-xs text-zinc-400">
        <LimitRow icon={Users} label={`Pacientes: ${limitLabel(plan.maxPatients)}`} />
        {plan.maxMealPlans > 0 && (
          <LimitRow icon={UtensilsCrossed} label={`Planes alimentarios: ${plan.maxMealPlans}`} />
        )}
        {plan.maxFoods > 0 && (
          <LimitRow icon={Apple} label={`Alimentos propios: ${plan.maxFoods}`} />
        )}
        <LimitRow icon={NotebookPen} label={diaryCapabilityLabel(plan)} />
        <LimitRow icon={Palette} label={whiteLabelLabel(plan.whiteLabel)} />
      </ul>

      <ul className="flex-1 space-y-2 border-t border-white/10 pt-4">
        {(plan.features ?? []).map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-400" />
            {f}
          </li>
        ))}
      </ul>
      {PLATFORM_EMAIL && (
        <CtaButton
          href={mailtoLink(PLATFORM_EMAIL, emailPlanSubject(plan)) ?? undefined}
          external={false}
          primary={featured}
          icon={<Mail className="size-4" />}
        >
          {planCtaLabel(plan)}
        </CtaButton>
      )}
    </div>
  )
}

/** Fila compacta de un límite del plan (ícono + etiqueta). */
function LimitRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-brand-400" />
      {label}
    </li>
  )
}
