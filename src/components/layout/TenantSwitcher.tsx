import { useState } from 'react'
import { Check, ChevronsUpDown, Building2 } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { cn } from '@/utils/cn'

export function TenantSwitcher() {
  const { memberships, activeMembership, selectClinic } = useTenant()
  const [open, setOpen] = useState(false)

  if (!activeMembership) return null
  const multiple = memberships.length > 1

  return (
    <div className="relative">
      <button
        onClick={() => multiple && setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-surface px-3 py-2 text-left',
          multiple && 'hover:bg-zinc-50',
        )}
      >
        <Building2 className="size-4 shrink-0 text-brand-500" />
        <span className="flex-1 truncate text-sm font-medium text-zinc-800">
          {activeMembership.clinicName}
        </span>
        {multiple && <ChevronsUpDown className="size-4 text-zinc-400" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-surface shadow-lg">
            {memberships.map((m) => (
              <button
                key={m.clinicId}
                onClick={() => {
                  selectClinic(m.clinicId)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50"
              >
                <span className="flex-1 truncate text-zinc-700">{m.clinicName}</span>
                {m.clinicId === activeMembership.clinicId && (
                  <Check className="size-4 text-brand-500" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
