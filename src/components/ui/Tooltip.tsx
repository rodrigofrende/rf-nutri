import { useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

const WIDTH = 240
const MARGIN = 8
const ARROW_SIZE = 8

type TooltipPlacement = 'top' | 'bottom'

interface TooltipCoords {
  top: number
  left: number
  arrowLeft: number
  placement: TooltipPlacement
}

export function Tooltip({
  text,
  children,
  className,
}: {
  text: string
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()
  const [coords, setCoords] = useState<TooltipCoords | null>(null)

  const show = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const half = WIDTH / 2
    const triggerCenter = r.left + r.width / 2
    const center = Math.min(
      Math.max(triggerCenter, MARGIN + half),
      window.innerWidth - MARGIN - half,
    )
    const placement: TooltipPlacement = r.top < 140 ? 'bottom' : 'top'
    const tooltipLeft = center - half
    const arrowLeft = Math.min(Math.max(triggerCenter - tooltipLeft, 16), WIDTH - 16)
    setCoords({
      top: placement === 'top' ? r.top - MARGIN : r.bottom + MARGIN,
      left: center,
      arrowLeft,
      placement,
    })
  }
  const hide = () => setCoords(null)

  return (
    <span
      ref={ref}
      aria-describedby={coords ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className={cn('inline-flex', className)}
    >
      {children}
      {coords &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{ top: coords.top, left: coords.left, width: WIDTH }}
            className={cn(
              'pointer-events-none fixed z-[60] -translate-x-1/2 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-normal leading-relaxed text-zinc-50 shadow-xl',
              coords.placement === 'top' ? '-translate-y-full' : 'translate-y-0',
            )}
          >
            {text}
            <span
              aria-hidden
              style={{
                left: coords.arrowLeft,
                width: ARROW_SIZE,
                height: ARROW_SIZE,
              }}
              className={cn(
                'absolute -translate-x-1/2 rotate-45 border-zinc-600 bg-zinc-800',
                coords.placement === 'top' ? '-bottom-1 border-b border-r' : '-top-1 border-l border-t',
              )}
            />
          </span>,
          document.body,
        )}
    </span>
  )
}
