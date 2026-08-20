/** Resultado de parsear una URL de video pegada por el admin. */
export type VideoEmbed =
  | { kind: 'youtube'; embedUrl: string; videoId: string }
  | { kind: 'instagram'; permalink: string; embedUrl?: string }
  | { kind: 'unknown'; url: string }

const YT_ID = /^[A-Za-z0-9_-]{11}$/
// /p/{shortcode}, /reel/{shortcode}, /tv/{shortcode}
const IG_PATH = /^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/

/**
 * Convierte una URL de YouTube o Instagram en datos para mostrarla:
 * - YouTube → URL embebible (`/embed/{id}`) para un `<iframe>`.
 * - Instagram → permalink limpio (se muestra como link; su embed es inestable
 *   sin el SDK de IG).
 * - Cualquier otra cosa → fallback `unknown` para mostrar un link simple.
 * Devuelve `null` si no hay URL.
 */
export function parseVideoUrl(raw?: string): VideoEmbed | null {
  const value = raw?.trim()
  if (!value) return null

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { kind: 'unknown', url: value }
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase()

  const ytId = extractYouTubeId(url, host)
  if (ytId) {
    return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytId}`, videoId: ytId }
  }

  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    const m = url.pathname.match(IG_PATH)
    if (m) {
      const permalink = `https://www.instagram.com/${m[1]}/${m[2]}/`
      // El endpoint `/embed` se puede incrustar en un iframe sin el SDK de IG y
      // muestra la miniatura/poster del reel o post.
      return { kind: 'instagram', permalink, embedUrl: `${permalink}embed` }
    }
    return { kind: 'instagram', permalink: value }
  }

  return { kind: 'unknown', url: value }
}

/** Miniatura de un video de YouTube (hqdefault existe para casi todos los videos). */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

function extractYouTubeId(url: URL, host: string): string | null {
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    return YT_ID.test(id) ? id : null
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const v = url.searchParams.get('v')
    if (v && YT_ID.test(v)) return v
    const parts = url.pathname.split('/').filter(Boolean) // ej. ['shorts','ID'] | ['embed','ID']
    if ((parts[0] === 'shorts' || parts[0] === 'embed') && YT_ID.test(parts[1] ?? '')) {
      return parts[1]
    }
  }
  return null
}
