import type { Tariff, TariffKind } from '@/types'
import { formatCurrency } from './format'

export const TARIFF_KIND_LABELS: Record<TariffKind, string> = {
  consulta: 'Consulta',
  tratamiento: 'Tratamiento',
  antropometria: 'Antropometría',
  otro: 'Otro',
}

export function tariffKindLabel(kind?: TariffKind): string {
  return kind ? TARIFF_KIND_LABELS[kind] : TARIFF_KIND_LABELS.otro
}

/** "Consulta de seguimiento · Consulta · $25.000" — para dropdowns y listados. */
export function tariffLabel(t: Tariff): string {
  return `${t.name} · ${tariffKindLabel(t.kind)} · ${formatCurrency(t.price)}`
}
