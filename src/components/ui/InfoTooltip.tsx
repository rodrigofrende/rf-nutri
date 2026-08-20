import { Info } from 'lucide-react'
import { Tooltip } from './Tooltip'

export function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip text={text}>
      <span
        tabIndex={0}
        className="inline-flex cursor-help align-middle text-zinc-500 outline-none hover:text-zinc-700 focus-visible:text-zinc-700"
      >
        <Info className="size-3.5" aria-hidden />
      </span>
    </Tooltip>
  )
}
