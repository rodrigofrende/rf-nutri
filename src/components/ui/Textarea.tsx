import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-[var(--radius-control)] border bg-surface px-3 py-2 text-base text-zinc-900 transition-colors sm:text-sm',
        'placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2',
        invalid
          ? 'border-red-400 focus-visible:ring-red-300'
          : 'border-zinc-200 focus-visible:border-brand-400 focus-visible:ring-brand-200',
        'disabled:cursor-not-allowed disabled:bg-zinc-50',
        className,
      )}
      {...props}
    />
  )
})
