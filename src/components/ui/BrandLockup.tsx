import { APP_NAME } from '@/config/app'
import { cn } from '@/utils/cn'

/**
 * Presets de tamaño del lockup: alto del "RF" + alto/offset del tag "FIT"
 * (proporción calibrada para que el tag quede como insignia en la esquina).
 */
const SIZES = {
  md: { logo: 'h-10', tag: 'h-3.5 -bottom-2 -right-4' },
  lg: { logo: 'h-14', tag: 'h-5 -bottom-2.5 -right-6' },
} as const

/**
 * Lockup de marca RF NUTRI: el "RF" es el protagonista y el tag "NUTRI" (píldora
 * azul) va encimado como insignia en la esquina inferior derecha.
 * - `variant='onDark'` usa el RF blanco (fondos oscuros, ej. landing).
 * - `variant='onLight'` usa el RF negro (fondos claros, ej. login).
 * El tag azul se lee sobre cualquier fondo, solo se ajusta la sombra.
 */
export function BrandLockup({
  variant = 'onDark',
  size = 'md',
  className,
}: {
  variant?: 'onDark' | 'onLight'
  size?: keyof typeof SIZES
  className?: string
}) {
  const s = SIZES[size]
  return (
    <span className={cn('relative inline-block', className)} aria-label={APP_NAME}>
      <img
        src={variant === 'onDark' ? '/brand/rf-logo-white.png' : '/brand/rf-logo-dark.png'}
        alt=""
        className={cn('w-auto', s.logo)}
      />
      <img
        src="/brand/nutri-tag.png"
        alt=""
        className={cn(
          'absolute w-auto',
          s.tag,
          variant === 'onDark'
            ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
            : 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]',
        )}
      />
    </span>
  )
}
