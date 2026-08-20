import type { ClinicTheme } from '@/types'
import { APP_NAME } from '@/config/app'
import { buildBrandScale, PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { initials } from '@/utils/format'

/**
 * Tarjeta compartible de la página pública (story 9:16, 1080×1920) dibujada en
 * canvas 2D, con la estética "Athletic Bold" de la página: fondo oscuro, glow
 * del color de marca, logo, nombre display gigante y CTA. Misma técnica y
 * garantías que rankingImage.ts: el logo es data URL (forzado por
 * firestore.rules) así que el canvas nunca queda tainted, y las fuentes ya
 * están cargadas por index.html.
 */

const W = 1080
const H = 1920

export async function drawClinicStoryImage(opts: {
  clinicName: string
  logoURL?: string
  theme?: ClinicTheme | null
}): Promise<Blob> {
  await Promise.all([
    document.fonts.load('130px Anton'),
    document.fonts.load('700 44px Montserrat'),
    document.fonts.load('600 36px Montserrat'),
    document.fonts.load('500 30px Montserrat'),
  ]).catch(() => undefined)
  await document.fonts.ready

  const theme = opts.theme ?? PLATFORM_DEFAULT_THEME
  const scale = buildBrandScale(theme.accent)
  const logo = await loadDataUrlImage(opts.logoURL)

  const SS = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * SS
  canvas.height = H * SS
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-context-unavailable')
  ctx.scale(SS, SS)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Fondo oscuro (zinc-950 de la página pública) + glow radial de marca arriba,
  // emulando el círculo blurreado del hero.
  ctx.fillStyle = '#09090b'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 430, 0, W / 2, 430, 760)
  glow.addColorStop(0, hexWithAlpha(scale[500], 0.32))
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Logo (data URL de 256 → 260px queda nítido) o tile de iniciales de marca.
  const logoSize = 260
  const logoX = (W - logoSize) / 2
  const logoY = 560
  if (logo) {
    ctx.save()
    roundRectPath(ctx, logoX, logoY, logoSize, logoSize, 52)
    ctx.clip()
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
    ctx.restore()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 3
    roundRectPath(ctx, logoX, logoY, logoSize, logoSize, 52)
    ctx.stroke()
  } else {
    ctx.fillStyle = scale[500]
    roundRectPath(ctx, logoX, logoY, logoSize, logoSize, 52)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '120px Anton, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials(opts.clinicName) || 'N', W / 2, logoY + logoSize / 2 + 8)
    ctx.textBaseline = 'alphabetic'
  }

  // Nombre display gigante (como el hero de la página), achicando si no entra.
  const name = opts.clinicName.toUpperCase()
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.font = fitFont(ctx, name, W - 140, 130, 'Anton, sans-serif')
  ctx.fillText(name, W / 2, 1042)

  // Barra de acento (la línea naranja/brand bajo el título del hero).
  ctx.fillStyle = scale[500]
  roundRectPath(ctx, W / 2 - 70, 1080, 140, 12, 6)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '600 36px Montserrat, sans-serif'
  ctx.fillText('TU NUTRICIÓN EMPIEZA ACÁ', W / 2, 1180)

  // CTA: en la historia, el admin pega el sticker "Enlace" cerca de este pill.
  const pillW = 660
  const pillH = 100
  const pillY = 1490
  ctx.fillStyle = scale[500]
  roundRectPath(ctx, (W - pillW) / 2, pillY, pillW, pillH, pillH / 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 40px Montserrat, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('MÁS INFO EN EL ENLACE', W / 2, pillY + pillH / 2 + 2)
  ctx.textBaseline = 'alphabetic'

  // Footer: dominio + marca de la plataforma.
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '500 30px Montserrat, sans-serif'
  ctx.fillText(
    fitText(ctx, `${window.location.host} · by ${APP_NAME}`, W - 140),
    W / 2,
    1856,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas-toblob-failed'))), 'image/png')
  })
}

/** Solo data URLs (sin taint del canvas); http(s) legacy → null (tile de iniciales). */
function loadDataUrlImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url || !/^data:image\//i.test(url)) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** '#rrggbb' + alpha 0-1 → 'rgba(...)' para gradientes. */
function hexWithAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Trunca con '…' si el texto supera maxWidth con la font actual del ctx. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
  return `${t}…`
}

/** Reduce el tamaño de fuente hasta que el texto entre en maxWidth. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  family: string,
): string {
  let px = startPx
  ctx.font = `${px}px ${family}`
  while (px > 40 && ctx.measureText(text).width > maxWidth) {
    px -= 4
    ctx.font = `${px}px ${family}`
  }
  return ctx.font
}
