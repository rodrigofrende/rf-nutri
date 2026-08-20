/**
 * Arma un link de WhatsApp click-to-chat (`wa.me`). El número se limpia a solo
 * dígitos (wa.me exige el número completo con código de país, sin símbolos).
 * Devuelve `null` si no hay número válido.
 */
export function whatsappLink(phone?: string, message?: string): string | null {
  const digits = phone?.replace(/\D/g, '') ?? ''
  if (!digits) return null
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}

/**
 * Arma un link `mailto:`, opcionalmente con asunto y cuerpo. `null` si no hay
 * email.
 *
 * Un `mailto:` ES el menú del sistema: en mobile abre el selector nativo de apps
 * de correo. Por eso no hace falta un menú propio con opciones — alcanza un link.
 *
 * OJO: se arma a mano y no con URLSearchParams porque éste codifica los espacios
 * como `+`, y en el cuerpo de un mail los clientes los muestran literalmente
 * como signos más. `encodeURIComponent` los deja como %20.
 */
export function mailtoLink(email?: string, subject?: string, body?: string): string | null {
  const value = email?.trim()
  if (!value) return null
  const params = [
    subject ? `subject=${encodeURIComponent(subject)}` : '',
    body ? `body=${encodeURIComponent(body)}` : '',
  ].filter(Boolean)
  return `mailto:${value}${params.length ? `?${params.join('&')}` : ''}`
}

/**
 * Normaliza cualquier input de Instagram a un handle limpio: acepta que peguen
 * la URL completa o el `@handle`, y devuelve solo `[A-Za-z0-9._]`. `''` si vacío.
 */
export function instagramHandle(input?: string): string {
  if (!input) return ''
  let v = input.trim()
  const m = v.match(/instagram\.com\/([^/?#]+)/i)
  if (m) v = m[1]
  return v.replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '')
}

/** Link a un perfil de Instagram a partir de un handle o input crudo. `null` si vacío. */
export function instagramUrl(input?: string): string | null {
  const h = instagramHandle(input)
  return h ? `https://www.instagram.com/${h}/` : null
}
