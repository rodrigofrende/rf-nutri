export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/** ¿El navegador soporta el share sheet nativo? (mobile + Safari/Edge/Chrome desktop) */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/** Dispara el share nativo de un link. Devuelve true si compartió, false si canceló/no pudo. */
export async function nativeShare(data: {
  title?: string
  text?: string
  url: string
}): Promise<boolean> {
  try {
    await navigator.share(data)
    return true
  } catch {
    // Cancelado por el usuario o no soportado → el caller cae a otra opción.
    return false
  }
}

/**
 * Links de "compartir a" por red social, para el fallback web cuando no hay share
 * nativo (o como opciones explícitas). Instagram no admite compartir por URL: ese
 * caso se cubre generando una imagen de historia + copiar el link (ver
 * SharePublicClinicButton).
 */
export function socialShareLinks(url: string, text: string) {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(text)
  const textAndUrl = encodeURIComponent(`${text} ${url}`)
  return {
    whatsapp: `https://wa.me/?text=${textAndUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    email: `mailto:?subject=${t}&body=${textAndUrl}`,
  }
}

/**
 * Comparte un PNG con el share sheet nativo (Web Share API con archivos —
 * mobile) o cae a descarga con `<a download>` (desktop). Sin links a la app.
 */
export async function shareOrDownloadPng(
  blob: Blob,
  filename: string,
  meta: { title: string; text: string },
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: meta.title, text: meta.text })
      return 'shared'
    } catch (err) {
      // Cancelado por el usuario → silencio; otros errores caen a descarga.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
  return 'downloaded'
}
