const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'El email no es válido.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  'auth/user-not-found': 'No encontramos una cuenta con ese email.',
  'auth/wrong-password': 'Email o contraseña incorrectos.',
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/weak-password': 'La contraseña es demasiado débil.',
  'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo más tarde.',
  'auth/popup-closed-by-user': 'Se canceló el inicio de sesión con Google.',
  'auth/network-request-failed': 'Sin conexión. Revisá tu internet.',
}

export function extractAuthCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
    // Solo códigos de Firebase Auth (auth/...). Los de Firestore (permission-denied,
    // failed-precondition, etc.) también tienen `.code`: se dejan pasar para que
    // los maneje extractFirestoreCode y no se reporten como error de auth.
    return err.code.startsWith('auth/') ? err.code : undefined
  }
  if (err instanceof Error) {
    const match = err.message.match(/auth\/[\w-]+/)
    return match?.[0]
  }
  return undefined
}

export function mapAuthError(err: unknown, fallback = 'No se pudo iniciar sesión'): string {
  const code = extractAuthCode(err)
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code]
  return fallback
}
