import { Spinner } from './Spinner'

export function BusyOverlay({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-surface/80 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-surface px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm">
        <Spinner className="size-4" />
        {label}
      </div>
    </div>
  )
}
