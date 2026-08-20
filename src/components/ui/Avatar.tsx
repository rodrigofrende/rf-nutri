import { initials } from '@/utils/format'
import { safeImageSrc } from '@/utils/url'
import { cn } from '@/utils/cn'

export function Avatar({
  name,
  src,
  size = 'md',
}: {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' }
  const safe = safeImageSrc(src)
  if (safe) {
    return (
      <img
        src={safe}
        alt={name}
        referrerPolicy="no-referrer"
        className={cn('rounded-[var(--radius-pill)] object-cover', sizes[size])}
      />
    )
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-[var(--radius-pill)] bg-brand-100 font-semibold text-brand-700',
        sizes[size],
      )}
    >
      {initials(name)}
    </div>
  )
}
