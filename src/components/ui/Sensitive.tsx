import type { ReactNode } from 'react'
import { usePrivacy } from '@/providers/PrivacyProvider'
import { cn } from '@/utils/cn'

/** Envuelve contenido sensible: se blurea cuando el modo discreto está activo. */
export function Sensitive({ children, className }: { children: ReactNode; className?: string }) {
  const { blurred } = usePrivacy()
  return (
    <span
      className={cn(
        'transition-[filter] duration-150',
        blurred && 'select-none blur-sm',
        className,
      )}
    >
      {children}
    </span>
  )
}
