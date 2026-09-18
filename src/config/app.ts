/** Marca general de la plataforma (UI fuera de un tenant). */
export const APP_NAME = 'RF NUTRI'

/** Tagline de la plataforma (landing y footers públicos). */
export const PLATFORM_TAGLINE = 'Gestión y presencia online para nutricionistas.'

/**
 * Email comercial de la plataforma (CTA principal de la landing, vía Cloudflare
 * Email Routing → Gmail). Vacío = los CTA de email se ocultan solos (mailtoLink → null).
 */
export const PLATFORM_EMAIL = 'hola@rf-platform.com'

/**
 * WhatsApp comercial de la plataforma, con código de país (ej. '5491122334455').
 * Vacío = los CTAs de WhatsApp de la landing se ocultan solos (whatsappLink → null).
 */
export const PLATFORM_WHATSAPP = '5491138303002'

/** Versión de la app, inyectada desde package.json por Vite (ver vite.config.ts). */
declare const __APP_VERSION__: string
export const APP_VERSION = __APP_VERSION__

/* ─── Ecosistema RF (selector de apps) ────────────────────────────────────────
 * Se mantiene POR COPIA en los cinco repos RF (rf-dev, gym-management,
 * RF-turnos, rf-nutri, rf-platform), como el logo: al lanzar un producto o
 * cambiar una URL hay que actualizar la lista en todos. El campo `kind` es del
 * 18/9/2026 y nació en rf-dev. */

export type RfProductId = 'fit' | 'med' | 'nutri' | 'logistica' | 'dev'

export interface RfProduct {
  id: RfProductId
  name: string
  /**
   * Qué clase de cosa es. Lo pidió Rodrigo el 18/9/2026 mirando el selector:
   * *"no es si incluir acá el DEV, quizás ponerlo al lado del platform, porque
   * no es un SaaS sino algo más propio para mostrar mi experiencia a posibles
   * clientes"*.
   *
   * - `app`: un SaaS que alguien contrata y usa. Va arriba de la línea, con su
   *   estado al costado — "Funcionando" y "Casi listo" son promesas sobre un
   *   producto, y sólo tienen sentido si hay un producto.
   * - `site`: la presencia web de RF. No se contrata: se visita. Va abajo de la
   *   línea, al lado de RF Platform, que es la otra mitad de lo mismo (el
   *   estudio y la persona que lo lleva).
   */
  kind: 'app' | 'site'
  status: 'live' | 'soon' | 'building'
  href: string | null
  /** Clase completa del dot: Tailwind no genera clases interpoladas. */
  dotClass: string
}

/** Qué producto es ESTE repo (marca "Estás acá" en el selector). */
export const CURRENT_RF_APP: RfProductId = 'nutri'

export const RF_PRODUCTS: RfProduct[] = [
  { id: 'fit', name: 'RF FIT', kind: 'app', status: 'live', href: 'https://fit.rf-platform.com', dotClass: 'bg-[#6366f1]' },
  // El href sigue apuntando a turnos.rf-platform.com: el dominio se muda a
  // med.rf-platform.com recién cuando estén el DNS y el 301. Cambiarlo antes
  // deja el selector de apps mandando a una URL que no existe.
  { id: 'med', name: 'RF MED', kind: 'app', status: 'live', href: 'https://turnos.rf-platform.com', dotClass: 'bg-[#0e7490]' },
  { id: 'nutri', name: 'RF NUTRI', kind: 'app', status: 'soon', href: null, dotClass: 'bg-[#10b981]' },
  { id: 'logistica', name: 'RF Logística', kind: 'app', status: 'building', href: null, dotClass: 'bg-zinc-500' },
  { id: 'dev', name: 'RF DEV', kind: 'site', status: 'live', href: 'https://dev.rf-platform.com', dotClass: 'bg-[#7c3aed]' },
]

/** Los SaaS: lo que el selector lista arriba de la línea. */
export const RF_APPS: RfProduct[] = RF_PRODUCTS.filter((product) => product.kind === 'app')

/** La presencia web de RF: lo que va abajo, con RF Platform. */
export const RF_SITES: RfProduct[] = RF_PRODUCTS.filter((product) => product.kind === 'site')
