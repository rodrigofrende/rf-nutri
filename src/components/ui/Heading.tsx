import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type HeadingVariant = 'display' | 'page' | 'card'

const VARIANTS: Record<HeadingVariant, string> = {
  display: 'text-2xl font-bold text-zinc-900',
  page: 'text-xl font-bold text-zinc-900',
  card: 'text-base font-semibold text-zinc-900',
}

const DEFAULT_TAG: Record<HeadingVariant, ElementType> = {
  display: 'h1',
  page: 'h2',
  card: 'h3',
}

interface HeadingProps extends HTMLAttributes<HTMLElement> {
  variant?: HeadingVariant
  as?: ElementType
  children: ReactNode
}

export function Heading({
  variant = 'page',
  as,
  className,
  children,
  ...props
}: HeadingProps) {
  const Tag = as ?? DEFAULT_TAG[variant]
  return (
    <Tag className={cn(VARIANTS[variant], className)} {...props}>
      {children}
    </Tag>
  )
}
