/**
 * Seguridad de URLs provistas por el usuario. Como estas URLs se renderizan en
 * `href`/`src`, hay que bloquear esquemas peligrosos (`javascript:`, `data:`,
 * `vbscript:`, ...). Solo permitimos http(s). Se usa tanto en la validación del
 * formulario como (defensivamente) al renderizar.
 */
export function isSafeHttpUrl(value?: string | null): boolean {
  const v = value?.trim()
  if (!v) return false
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Devuelve la URL si es http(s) segura; si no, `null` (para render defensivo). */
export function safeHttpUrl(value?: string | null): string | null {
  const v = value?.trim()
  return v && isSafeHttpUrl(v) ? v : null
}

/**
 * Variante para `src` de imágenes (logos): además de http(s) permite data URLs
 * de imagen (`data:image/...`), que es como se guardan los logos subidos desde
 * "Marca". Nunca usar para `href`.
 */
export function isSafeImageSrc(value?: string | null): boolean {
  const v = value?.trim()
  if (!v) return false
  if (/^data:image\//i.test(v)) return true
  return isSafeHttpUrl(v)
}

/** Devuelve el src si es seguro para `<img>`; si no, `null`. */
export function safeImageSrc(value?: string | null): string | null {
  const v = value?.trim()
  return v && isSafeImageSrc(v) ? v : null
}
