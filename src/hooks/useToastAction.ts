import { useCallback } from 'react'
import { useToast } from '@/providers/ToastProvider'
import { mapFirestoreError } from '@/utils/firestoreErrors'

interface ToastActionMessages {
  /** Toast de éxito. Si se omite, no se notifica el éxito. */
  success?: string
  /** Fallback si el error no tiene un mensaje conocido. */
  error: string
}

/**
 * Centraliza el patrón "mutación + toast": ejecuta la acción, notifica éxito
 * o traduce el error de Firestore a un mensaje legible. Devuelve `true` si la
 * acción terminó bien, para que la pantalla decida el paso siguiente (cerrar
 * un modal, limpiar un form) sin try/catch repetido.
 */
export function useToastAction() {
  const { notify } = useToast()

  return useCallback(
    async (action: () => Promise<unknown>, messages: ToastActionMessages): Promise<boolean> => {
      try {
        await action()
        if (messages.success) notify(messages.success, 'success')
        return true
      } catch (err) {
        notify(mapFirestoreError(err, messages.error), 'error')
        return false
      }
    },
    [notify],
  )
}
