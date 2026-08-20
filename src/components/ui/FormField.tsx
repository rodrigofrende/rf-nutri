import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { InfoTooltip } from './InfoTooltip'

export function FormField({
  label,
  hint,
  tooltip,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  tooltip?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  const fieldId = useId()
  const errorId = useId()
  const hintId = useId()
  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined]
    .filter(Boolean)
    .join(' ') || undefined

  const control =
    isValidElement(children) && !Array.isArray(children)
      ? cloneElement(children as ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>, {
          id: (children.props as { id?: string }).id ?? fieldId,
          'aria-invalid': error ? true : (children.props as { 'aria-invalid'?: boolean })['aria-invalid'],
          'aria-describedby': describedBy,
        })
      : children

  return (
    <div className="block space-y-1.5">
      <label htmlFor={fieldId} className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
        <span>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-xs leading-relaxed text-zinc-500">
          {hint}
        </p>
      )}
      {error && (
        <span id={errorId} role="alert" className="block text-xs text-red-500">
          {error}
        </span>
      )}
    </div>
  )
}
