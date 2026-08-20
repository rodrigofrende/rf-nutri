import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { formatThousands, parseMoney } from '@/utils/format'

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: number
  onChange: (value: number) => void
  invalid?: boolean
}

/**
 * Input de dinero: muestra el monto con `.` de miles y prefijo `$`, sin
 * decimales. Trabaja siempre con números enteros (pesos redondos).
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { className, value, onChange, invalid, ...props },
  ref,
) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-zinc-400 sm:text-sm">
        $
      </span>
      <input
        ref={ref}
        inputMode="numeric"
        value={value ? formatThousands(value) : ''}
        onChange={(e) => onChange(parseMoney(e.target.value))}
        className={cn(
          'h-11 w-full rounded-[var(--radius-control)] border bg-surface pl-7 pr-3 text-base text-zinc-900 transition-colors sm:h-10 sm:text-sm',
          'placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2',
          invalid
            ? 'border-red-400 focus-visible:ring-red-300'
            : 'border-zinc-200 focus-visible:border-brand-400 focus-visible:ring-brand-200',
          'disabled:cursor-not-allowed disabled:bg-zinc-50',
          className,
        )}
        {...props}
      />
    </div>
  )
})
