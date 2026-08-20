import type { LucideIcon } from 'lucide-react'
import { AtSign, Globe, Link2, MapPin, MessageCircle, PlayCircle } from 'lucide-react'

/** Elige un icono según el host del enlace (mejora el reconocimiento visual). */
export function linkIcon(url: string): LucideIcon {
  let host: string
  try {
    host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return Link2
  }
  if (host.includes('instagram')) return AtSign
  if (host.includes('youtube') || host === 'youtu.be') return PlayCircle
  if (host.includes('facebook') || host === 'fb.com') return Globe
  if (host.includes('whatsapp') || host === 'wa.me') return MessageCircle
  if (host.includes('maps') || host.includes('goo.gl')) return MapPin
  return Link2
}
