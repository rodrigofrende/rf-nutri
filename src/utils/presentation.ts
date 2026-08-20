import type { ClinicLink, ClinicPresentation } from '@/types'
import { isSafeHttpUrl } from './url'

export interface ResolvedPresentation {
  videos: string[]
  links: ClinicLink[]
}

/**
 * Normaliza la presentación a `{ videos, links }` saneados: URLs http(s)
 * válidas, labels sin espacios sobrantes. Todo lo demás se descarta silencioso
 * (el doc es world-readable y editable por el admin: mejor no renderizar
 * cualquier cosa que haya quedado guardada).
 */
export function resolvePresentation(data?: Partial<ClinicPresentation> | null): ResolvedPresentation {
  if (!data) return { videos: [], links: [] }

  const videos = (data.videos ?? [])
    .map((v) => v?.trim() ?? '')
    .filter((v) => isSafeHttpUrl(v))

  const links = (data.links ?? [])
    .filter((l) => l && l.label?.trim() && isSafeHttpUrl(l.url))
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))

  return { videos, links }
}
