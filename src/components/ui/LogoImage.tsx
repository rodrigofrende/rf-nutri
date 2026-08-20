import { useState } from 'react'
import { Dumbbell, type LucideIcon } from 'lucide-react'
import { safeImageSrc } from '@/utils/url'
import { cn } from '@/utils/cn'

/**
 * Logo del clinic con render defensivo: sanea el `src` (http(s) o data:image),
 * evita el bloqueo por Referer de CDNs externos (`no-referrer`) y si la imagen
 * falla al cargar cae a un tile con un ícono (en vez de la imagen rota del
 * navegador).
 */
export function LogoImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackIcon: FallbackIcon = Dumbbell,
  iconClassName = 'size-6',
}: {
  src?: string | null
  alt: string
  /** Tamaño/forma compartidos por la imagen y el fallback (ej. "size-11 rounded-xl"). */
  className?: string
  /** Overrides solo para el tile de fallback (ej. otro fondo). */
  fallbackClassName?: string
  fallbackIcon?: LucideIcon
  iconClassName?: string
}) {
  const safe = safeImageSrc(src)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!safe || safe === failedSrc) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-brand-600 text-white',
          className,
          fallbackClassName,
        )}
      >
        <FallbackIcon className={iconClassName} aria-hidden />
      </div>
    )
  }

  return (
    <img
      src={safe}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(safe)}
      className={cn('object-cover', className)}
    />
  )
}
