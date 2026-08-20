import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/utils/cn'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

function fitHeight(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, el.clientHeight)}px`
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 3, onInput, ...props },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    fitHeight(innerRef.current)
  }, [props.value, props.defaultValue, rows])

  return (
    <textarea
      ref={(node) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      rows={rows}
      {...props}
      className={cn(
        'w-full rounded-[var(--radius-control)] border bg-surface px-3 py-2 text-base text-zinc-900 transition-colors sm:text-sm',
        'field-sizing-fixed min-h-20 resize-y overflow-hidden',
        'placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2',
        invalid
          ? 'border-red-400 focus-visible:ring-red-300'
          : 'border-zinc-200 focus-visible:border-brand-400 focus-visible:ring-brand-200',
        'disabled:cursor-not-allowed disabled:bg-zinc-50',
        className,
      )}
      onInput={(e) => {
        fitHeight(e.currentTarget)
        onInput?.(e)
      }}
    />
  )
})
