import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  invalid?: boolean
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="date"
      inputMode="none"
      className={cn(
        'h-11 w-full min-w-0 rounded-[var(--radius-control)] border bg-surface px-3 text-base text-zinc-900 transition-colors sm:h-10 sm:text-sm',
        'focus-visible:outline-none focus-visible:ring-2',
        '[color-scheme:light]',
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
