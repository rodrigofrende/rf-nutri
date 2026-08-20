import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type TextVariant = 'body' | 'label' | 'caption' | 'metric' | 'listItem'

const VARIANTS: Record<TextVariant, string> = {
  body: 'text-sm text-zinc-700',
  label: 'text-sm font-semibold text-zinc-700',
  caption: 'text-xs text-zinc-500',
  metric: 'text-2xl font-bold text-zinc-900',
  listItem: 'text-sm font-medium text-zinc-900',
}

const DEFAULT_TAG: Record<TextVariant, ElementType> = {
  body: 'p',
  label: 'p',
  caption: 'p',
  metric: 'p',
  listItem: 'span',
}

interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant
  as?: ElementType
  children: ReactNode
}

export function Text({
  variant = 'body',
  as,
  className,
  children,
  ...props
}: TextProps) {
  const Tag = as ?? DEFAULT_TAG[variant]
  return (
    <Tag className={cn(VARIANTS[variant], className)} {...props}>
      {children}
    </Tag>
  )
}
