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
