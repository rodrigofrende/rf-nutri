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
  membership: { label: 'Etiqueta', icon: Tags },
  calendar: { label: 'Calendario', icon: Calendar },
  heart: { label: 'Corazón', icon: HeartPulse },
  activity: { label: 'Actividad', icon: Activity },
  dumbbell: { label: 'Mancuerna', icon: Dumbbell },
  users: { label: 'Personas', icon: Users },
  star: { label: 'Estrella', icon: Star },
  crown: { label: 'Corona', icon: Crown },
  zap: { label: 'Rayo', icon: Zap },
  sparkles: { label: 'Destellos', icon: Sparkles },
}

export const TARIFF_ICON_OPTIONS: IconSelectOption<TariffIconKey>[] = (
  Object.keys(TARIFF_ICONS) as TariffIconKey[]
).map((value) => ({ value, ...TARIFF_ICONS[value] }))

export function tariffIconMeta(icon?: TariffIconKey): TariffIconMeta {
  return TARIFF_ICONS[icon ?? 'membership']
}
