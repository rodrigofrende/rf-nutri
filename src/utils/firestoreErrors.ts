/** Mensajes amigables para códigos de error de Firestore/Firebase. */
const FIRESTORE_ERROR_MESSAGES: Record<string, string> = {
  'permission-denied': 'No tenés permiso para realizar esta acción.',
  unauthenticated: 'Tu sesión expiró. Volvé a iniciar sesión.',
  'not-found': 'El dato ya no existe o fue eliminado.',
  'already-exists': 'Ya existe un registro con esos datos.',
  unavailable: 'Sin conexión con el servidor. Revisá tu internet.',
  'deadline-exceeded': 'La operación tardó demasiado. Probá de nuevo.',
  'resource-exhausted': 'Demasiadas solicitudes. Esperá unos segundos y reintentá.',
  cancelled: 'La operación fue cancelada.',
  'invalid-argument': 'Los datos enviados no son válidos.',
  'failed-precondition': 'La operación no se puede completar en este estado.',
  aborted: 'Hubo un conflicto al guardar. Probá de nuevo.',
}

export function extractFirestoreCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
    // Firebase usa códigos tipo 'permission-denied' o 'firestore/permission-denied'.
    return err.code.split('/').pop()
  }
  if (err instanceof Error) {
    const match = err.message.match(
      /permission-denied|unauthenticated|not-found|already-exists|unavailable|deadline-exceeded|resource-exhausted|cancelled|invalid-argument|failed-precondition|aborted/,
    )
    return match?.[0]
  }
  return undefined
}

/**
 * Traduce un error de Firestore a un mensaje legible para el usuario.
 * Los errores de validación de dominio (Error con mensaje propio, ej. Zod en
 * services) se muestran tal cual; el resto cae al fallback de la pantalla.
 */
export function mapFirestoreError(err: unknown, fallback = 'Algo salió mal. Probá de nuevo.'): string {
  const code = extractFirestoreCode(err)
  if (code === 'invalid-argument' && err instanceof Error && err.message.includes('Unsupported field value: undefined')) {
    return 'Hay campos opcionales sin valor. Revisá los datos y probá de nuevo.'
  }
  if (code && FIRESTORE_ERROR_MESSAGES[code]) return FIRESTORE_ERROR_MESSAGES[code]
  if (err instanceof Error && !('code' in err) && err.message && !err.message.includes('Firebase')) {
    return err.message
  }
  return fallback
}

/** Errores que no tiene sentido reintentar automáticamente. */
export function isNonRetryableError(err: unknown): boolean {
  const code = extractFirestoreCode(err)
  return code === 'permission-denied' || code === 'unauthenticated' || code === 'invalid-argument'
}
