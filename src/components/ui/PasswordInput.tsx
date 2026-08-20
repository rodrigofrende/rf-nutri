import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  invalid?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, invalid, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn(
          'h-11 w-full rounded-[var(--radius-control)] border bg-surface px-3 pr-11 text-base text-zinc-900 transition-colors sm:h-10 sm:text-sm',
          'placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2',
          invalid
            ? 'border-red-400 focus-visible:ring-red-300'
            : 'border-zinc-200 focus-visible:border-brand-400 focus-visible:ring-brand-200',
          'disabled:cursor-not-allowed disabled:bg-zinc-50',
          className,
        )}
        {...props}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-[var(--radius-control)] text-zinc-400 transition-colors hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
})
