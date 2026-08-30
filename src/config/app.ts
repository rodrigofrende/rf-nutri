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
 * Se mantiene POR COPIA en los repos RF, como el logo: al lanzar un producto o
 * cambiar una URL hay que actualizar la lista en todos. */

export type RfProductId = 'fit' | 'turnos' | 'nutri' | 'logistica'

export interface RfProduct {
  id: RfProductId
  name: string
  status: 'live' | 'soon' | 'building'
  href: string | null
  /** Clase completa del dot: Tailwind no genera clases interpoladas. */
  dotClass: string
}

/** Qué producto es ESTE repo (marca "Estás acá" en el selector). */
export const CURRENT_RF_APP: RfProductId = 'nutri'

export const RF_PRODUCTS: RfProduct[] = [
  { id: 'fit', name: 'RF FIT', status: 'live', href: 'https://fit.rf-platform.com', dotClass: 'bg-[#6366f1]' },
  { id: 'turnos', name: 'RF Turnos', status: 'live', href: 'https://rf-turnos.netlify.app', dotClass: 'bg-[#da164c]' },
  { id: 'nutri', name: 'RF NUTRI', status: 'soon', href: null, dotClass: 'bg-[#10b981]' },
  { id: 'logistica', name: 'RF Logística', status: 'building', href: null, dotClass: 'bg-zinc-500' },
]
