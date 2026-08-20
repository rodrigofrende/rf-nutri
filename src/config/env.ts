const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined

/** Hay credenciales Firebase mínimas para inicializar la app real. */
export function hasFirebaseConfig(): boolean {
  return Boolean(apiKey?.trim() && projectId?.trim())
}

/** Config de runtime leída de import.meta.env (VITE_*). Centralizada acá. */
export const env = {
  firebase: {
    apiKey: apiKey ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: projectId ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  },
  useEmulator: import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true',
  googleLoginEnabled: import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true',
  // App Check (reCAPTCHA v3): atestación de que las requests vienen de la app
  // real y no de scripts que reusan la apiKey pública del bundle.
  appCheckSiteKey: (import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY as string | undefined)?.trim() || '',
  // Token de debug para desarrollo/CI (consola → App Check → Debug tokens).
  // "true" genera uno nuevo en consola; un string usa ese token fijo.
  appCheckDebugToken: (import.meta.env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined)?.trim() || '',
  // Modo demo (datos en memoria, sin Firebase). Explícito: no se activa solo por
  // falta de credenciales, para que un deploy mal configurado falle ruidosamente
  // en vez de servir la app demo con bypass de auth.
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
  // Topic de ntfy donde caen los avisos de error (ver src/utils/errorReporting.ts).
  // OJO: NO es un secreto. Vite inlinea las VITE_* en el bundle, así que el
  // nombre es público igual que si estuviera hardcodeado. Está acá para tener una
  // sola fuente de verdad (la comparte scripts/notify-deploy.mjs) y para poder
  // rotarlo desde Netlify sin tocar código. Vacío = no se reporta nada.
  ntfyTopic: (import.meta.env.VITE_NTFY_TOPIC as string | undefined)?.trim() || '',
}
