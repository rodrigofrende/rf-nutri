/**
 * Procesamiento de imágenes en el navegador para logos, patrocinadores y
 * productos. Evita depender de Firebase Storage: el archivo se recorta/comprime
 * a un cuadrado chico y se guarda como data URL en Firestore.
 */

const SQUARE_SIZE = 256
const MAX_INPUT_BYTES = 5 * 1024 * 1024 // 5MB de archivo original
const MAX_LOGO_OUTPUT_BYTES = 150 * 1024 // tope del data URL guardado en Firestore
// Las imágenes de sponsors comparten el doc `publicProfiles` (tope 1MiB de
// Firestore): con hasta 6 sponsors + el logo, 100KB c/u deja margen de sobra.
const MAX_SPONSOR_OUTPUT_BYTES = 100 * 1024
// Producto: doc propio (margen de sobra vs 1MiB) y card más protagonista → más
// resolución. Entrada generosa porque la foto suele venir del teléfono (una
// cámara de 48/50MP puede superar los 10MB); el tope solo cuida la memoria al
// decodificar, la salida igual se comprime a <150KB.
const PRODUCT_SIZE = 512
const MAX_PRODUCT_INPUT_BYTES = 25 * 1024 * 1024
const MAX_PRODUCT_OUTPUT_BYTES = 150 * 1024 // espejado en firestore.rules (153600)
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4]

export class LogoImageError extends Error {}

// Safari/WebKit (todo navegador en iOS) no codifica WebP desde canvas:
// `toDataURL('image/webp')` devuelve un PNG e ignora la calidad, y un PNG
// fotográfico nunca entra en el tope → ahí se usa JPEG (las rules ya lo
// aceptan). Se detecta una sola vez con un canvas de 1×1.
let webpEncodeSupported: boolean | null = null
function supportsWebpEncoding(): boolean {
  if (webpEncodeSupported === null) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    webpEncodeSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  }
  return webpEncodeSupported
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // algunos formatos (ej. SVG) no soportan createImageBitmap; cae al <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new LogoImageError('No se pudo leer la imagen.'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function fileToSquareDataUrl(
  file: File,
  maxOutputBytes: number,
  size = SQUARE_SIZE,
  maxInputBytes = MAX_INPUT_BYTES,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new LogoImageError('El archivo debe ser una imagen (JPG, PNG, WebP...).')
  }
  if (file.size > maxInputBytes) {
    throw new LogoImageError(
      `La imagen es muy pesada (máximo ${Math.round(maxInputBytes / (1024 * 1024))}MB).`,
    )
  }

  const source = await loadBitmap(file)
  const width = source.width
  const height = source.height
  if (!width || !height) {
    throw new LogoImageError('No se pudo leer la imagen.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new LogoImageError('No se pudo procesar la imagen en este navegador.')
  }

  // JPEG no tiene canal alfa: sin esto, lo transparente (ej. logos PNG) sale negro.
  const mime = supportsWebpEncoding() ? 'image/webp' : 'image/jpeg'
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
  }

  // Recorte tipo `cover`: se toma el cuadrado central de la imagen original.
  const side = Math.min(width, height)
  const sx = (width - side) / 2
  const sy = (height - side) / 2
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size)
  if ('close' in source) source.close()

  for (const quality of QUALITY_STEPS) {
    const dataUrl = canvas.toDataURL(mime, quality)
    if (dataUrl.length <= maxOutputBytes) return dataUrl
  }
  throw new LogoImageError('No se pudo comprimir la imagen; probá con una más simple.')
}

/**
 * Convierte un archivo de imagen en un data URL cuadrado (256×256, recorte
 * `cover`) comprimido en WebP. Rechaza con `LogoImageError` (mensaje apto para
 * mostrar al usuario) si el archivo no es una imagen o queda demasiado pesado.
 */
export function fileToLogoDataUrl(file: File): Promise<string> {
  return fileToSquareDataUrl(file, MAX_LOGO_OUTPUT_BYTES)
}

/**
 * Ídem `fileToLogoDataUrl` pero para la imagen de un patrocinador: mismas
 * restricciones de entrada, tope de salida más chico (espejado en el tope por
 * sponsor de firestore.rules).
 */
export function fileToSponsorImageDataUrl(file: File): Promise<string> {
  return fileToSquareDataUrl(file, MAX_SPONSOR_OUTPUT_BYTES)
}

/**
 * Foto de producto: 512×512 recorte `cover`, WebP (o JPEG donde el navegador
 * no codifica WebP, ej. iOS), tope 150KB (espejado en firestore.rules).
 * Acepta originales de hasta 25MB (fotos de celular).
 */
export function fileToProductImageDataUrl(file: File): Promise<string> {
  return fileToSquareDataUrl(file, MAX_PRODUCT_OUTPUT_BYTES, PRODUCT_SIZE, MAX_PRODUCT_INPUT_BYTES)
}
