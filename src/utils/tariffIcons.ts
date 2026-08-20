import {
  Activity,
  Calendar,
  Crown,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Star,
  Tags,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { IconSelectOption } from '@/components/ui/IconSelect'
import type { TariffIconKey } from '@/types'

export interface TariffIconMeta {
  label: string
  icon: LucideIcon
  keywords?: string[]
}

export const TARIFF_ICONS: Record<TariffIconKey, TariffIconMeta> = {
  membership: { label: 'Plan mensual', icon: Tags, keywords: ['plan', 'tarifa', 'seguimiento'] },
  dumbbell: { label: 'Deportiva', icon: Dumbbell, keywords: ['deporte', 'rendimiento', 'atleta'] },
  activity: { label: 'Antropometría', icon: Activity, keywords: ['medición', 'pliegues', 'composición'] },
  heart: { label: 'Salud', icon: HeartPulse, keywords: ['clínica', 'patología', 'cardio'] },
  users: { label: 'Grupal', icon: Users, keywords: ['taller', 'grupo', 'familia'] },
  calendar: { label: 'Consulta', icon: Calendar, keywords: ['turno', 'primera', 'seguimiento'] },
  star: { label: 'Destacado', icon: Star, keywords: ['premium', 'popular'] },
  crown: { label: 'Premium', icon: Crown, keywords: ['vip', 'plus', 'pro'] },
  zap: { label: 'Express', icon: Zap, keywords: ['rápido', 'virtual', 'online'] },
  sparkles: { label: 'Especial', icon: Sparkles, keywords: ['promo', 'nuevo', 'pack'] },
}

export const TARIFF_ICON_OPTIONS: IconSelectOption<TariffIconKey>[] = (
  Object.keys(TARIFF_ICONS) as TariffIconKey[]
).map((value) => ({ value, ...TARIFF_ICONS[value] }))

export function tariffIconMeta(icon?: TariffIconKey): TariffIconMeta {
  return TARIFF_ICONS[icon ?? 'membership']
}
