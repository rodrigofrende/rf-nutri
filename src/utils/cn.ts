import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Compone clases de Tailwind sin conflictos ni repetición. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
