import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-[var(--radius-control)] border bg-surface px-3 text-base text-zinc-900 transition-colors sm:h-10 sm:text-sm',
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
