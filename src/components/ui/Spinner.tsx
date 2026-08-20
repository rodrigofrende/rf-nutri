import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-brand-500', className)} />
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[60vh] w-full items-center justify-center">
      <Spinner className="size-8" />
    </div>
  )
}
