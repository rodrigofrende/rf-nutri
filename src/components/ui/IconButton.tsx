import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type IconButtonTone = 'default' | 'brand' | 'danger'
type IconButtonSize = 'sm' | 'md'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  tone?: IconButtonTone
  size?: IconButtonSize
}

const TONES: Record<IconButtonTone, string> = {
  default: 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:ring-zinc-300',
  brand: 'text-zinc-400 hover:bg-brand-50 hover:text-brand-600 focus-visible:ring-brand-500',
  danger: 'text-zinc-400 hover:bg-red-50 hover:text-red-500 focus-visible:ring-red-400',
}

const SIZES: Record<IconButtonSize, string> = {
  sm: 'rounded-[var(--radius-control)] p-1',
  md: 'rounded-[var(--radius-control)] p-1.5',
}

export function IconButton({
  icon,
  label,
  tone = 'default',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center transition-colors',
        'focus-visible:outline-none focus-visible:ring-2',
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
