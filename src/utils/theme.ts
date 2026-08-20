import type { ClinicTheme } from '@/types'

/** Theme base de la plataforma cuando el consultorio no personalizó colores. */
export const PLATFORM_DEFAULT_THEME: ClinicTheme = {
  accent: '#059669',
  background: '#fafafa',
  container: '#ffffff',
  text: '#18181b',
}

export interface BrandingPreset {
  id: string
  label: string
  theme: ClinicTheme
}

/**
 * Paletas CURADAS para el white-label (única forma de tematizar; no hay selección
 * de color libre). Cada una está anclada en la escala de Tailwind: accent en el
 * tono ~600, fondo muy claro del mismo hue y texto muy oscuro → buen contraste
 * garantizado en la app, en la página pública (fondo derivado oscuro) y con el
 * logo RF blanco. Ordenadas por hue para que la galería se lea prolija.
 */
export const BRANDING_PRESETS: BrandingPreset[] = [
  { id: 'emerald', label: 'Verde', theme: PLATFORM_DEFAULT_THEME },
  { id: 'indigo', label: 'Índigo', theme: { accent: '#4f46e5', background: '#eef2ff', container: '#ffffff', text: '#1e1b4b' } },
  { id: 'blue', label: 'Azul', theme: { accent: '#2563eb', background: '#eff6ff', container: '#ffffff', text: '#172554' } },
  { id: 'sky', label: 'Cielo', theme: { accent: '#0284c7', background: '#f0f9ff', container: '#ffffff', text: '#082f49' } },
  { id: 'teal', label: 'Turquesa', theme: { accent: '#0d9488', background: '#f0fdfa', container: '#ffffff', text: '#042f2e' } },
  { id: 'lime', label: 'Lima', theme: { accent: '#65a30d', background: '#f7fee7', container: '#ffffff', text: '#1a2e05' } },
  { id: 'amber', label: 'Ámbar', theme: { accent: '#d97706', background: '#fffbeb', container: '#ffffff', text: '#451a03' } },
  { id: 'orange', label: 'Naranja', theme: { accent: '#ea580c', background: '#fff7ed', container: '#ffffff', text: '#431407' } },
  { id: 'red', label: 'Rojo', theme: { accent: '#dc2626', background: '#fef2f2', container: '#ffffff', text: '#450a0a' } },
  { id: 'rose', label: 'Rosa', theme: { accent: '#e11d48', background: '#fff1f2', container: '#ffffff', text: '#4c0519' } },
  { id: 'fuchsia', label: 'Fucsia', theme: { accent: '#c026d3', background: '#fdf4ff', container: '#ffffff', text: '#4a044e' } },
  { id: 'violet', label: 'Violeta', theme: { accent: '#7c3aed', background: '#f5f3ff', container: '#ffffff', text: '#2e1065' } },
  { id: 'slate', label: 'Gris', theme: { accent: '#475569', background: '#f8fafc', container: '#ffffff', text: '#0f172a' } },
]

const HEX6 = /^#?[0-9a-f]{6}$/i

/** Normaliza un hex a `#RRGGBB` válido para inputs type=color. */
export function normalizeHex(value: string, fallback = '#000000'): string {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (HEX6.test(withHash)) return withHash.toLowerCase()
  if (withHash.length === 4) {
    const r = withHash[1]
    const g = withHash[2]
    const b = withHash[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return fallback
}

/**
 * Theming white-label por tenant. Tailwind v4 expone los colores del bloque
 * `@theme` como variables CSS en `:root` (ej. `--color-brand-600`), y las
 * utilidades (`bg-brand-600`, `bg-surface`, ...) las referencian. Sobreescribir
 * esas variables en runtime re-tematiza toda la app sin tocar componentes.
 */

// Tonos que usa la rampa brand y la posición (0..1) de su lightness en la escala.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const
// Lightness objetivo por tono (el accent del clinic ancla en el 600).
const LIGHTNESS: Record<(typeof SHADES)[number], number> = {
  50: 0.97,
  100: 0.94,
  200: 0.86,
  300: 0.75,
  400: 0.64,
  500: 0.55,
  600: 0.48,
  700: 0.4,
  800: 0.32,
  900: 0.24,
}

interface Hsl {
  h: number
  s: number
  l: number
}

function hexToHsl(hex: string): Hsl {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { h, s, l }
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const mm = l - c / 2
  let r: number
  let g: number
  let b: number
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (v: number) =>
    Math.round((v + mm) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

/** Mezcla lineal entre dos colores (t=0 → a, t=1 → b). */
function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const to = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0')
  return `#${to(ar, br)}${to(ag, bg)}${to(ab, bb)}`
}

/** Genera la escala brand-50..900 a partir del color accent del clinic. */
export function buildBrandScale(accentHex: string): Record<(typeof SHADES)[number], string> {
  const base = hexToHsl(accentHex)
  const scale = {} as Record<(typeof SHADES)[number], string>
  for (const shade of SHADES) {
    // Tonos claros con menos saturación para que no "griten"; oscuros un poco más.
    const l = LIGHTNESS[shade]
    const s = Math.min(1, base.s * (l > 0.85 ? 0.7 : l < 0.4 ? 1.05 : 1))
    scale[shade] = hslToHex({ h: base.h, s, l })
  }
  return scale
}

const VARS_TO_CLEAR = [
  ...SHADES.map((s) => `--color-brand-${s}`),
  '--color-surface',
  '--color-surface-muted',
  '--color-zinc-900',
  '--color-zinc-800',
  '--color-zinc-700',
  // Futuro white-label (tipografía / radios): descomentar al agregar campos a ClinicTheme.
  // '--font-sans',
  // '--radius-control',
  // '--radius-card',
  // '--radius-pill',
]

/** Mapa de variables CSS para un theme. Útil para aplicar a `:root` o a un preview. */
export function buildThemeVars(theme: ClinicTheme): Record<string, string> {
  const scale = buildBrandScale(theme.accent)
  const vars: Record<string, string> = {
    '--color-surface': theme.container,
    '--color-surface-muted': theme.background,
  }
  SHADES.forEach((shade) => (vars[`--color-brand-${shade}`] = scale[shade]))

  // Color de texto: solo el foreground fuerte (títulos, valores, texto base).
  // El 800/700 se atenúan hacia el contenedor para textos secundarios.
  const text = theme.text || '#18181b'
  vars['--color-zinc-900'] = text
  vars['--color-zinc-800'] = lerpHex(text, theme.container, 0.12)
  vars['--color-zinc-700'] = lerpHex(text, theme.container, 0.24)

  // Futuro white-label: mapear theme.fontFamily → '--font-sans',
  // theme.radiusControl → '--radius-control', etc.

  return vars
}

/**
 * Aplica el theme del tenant activo a `:root`. Con `null` quita los overrides y
 * vuelve al default de `index.css` (marca general de la app: login, select-clinic).
 */
export function applyTenantTheme(theme: ClinicTheme | null): void {
  const root = document.documentElement
  if (!theme) {
    VARS_TO_CLEAR.forEach((v) => root.style.removeProperty(v))
    return
  }
  const vars = buildThemeVars(theme)
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
}
