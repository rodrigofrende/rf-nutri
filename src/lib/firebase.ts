import { initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth, connectAuthEmulator, GoogleAuthProvider, type Auth } from 'firebase/auth'
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { env, hasFirebaseConfig } from '@/config/env'

// En modo demo NO inicializamos Firebase (evita el crash auth/invalid-api-key sin claves).
// Las ramas demo de los servicios nunca tocan estos placeholders.
let auth: Auth
let db: Firestore
let googleProvider: GoogleAuthProvider

// Fail-fast: en un build real (no demo) sin credenciales, cortar acá con un error
// claro en vez de arrancar a medias. Antes esto caía a modo demo silenciosamente.
if (!env.demoMode && !hasFirebaseConfig()) {
  throw new Error(
    'Falta la configuración de Firebase (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID). ' +
      'Completá las credenciales en el entorno o activá VITE_DEMO_MODE=true para el modo demo.',
  )
}

if (!env.demoMode) {
  const app: FirebaseApp = initializeApp(env.firebase)

  // App Check: cada request lleva un token de atestación firmado por reCAPTCHA.
  // Con enforcement activo en la consola, Firestore/Auth rechazan las requests
  // que no lo traen, cortando el acceso scripteado que reusa la apiKey pública.
  if (env.appCheckSiteKey) {
    if (env.appCheckDebugToken) {
      ;(
        globalThis as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
      ).FIREBASE_APPCHECK_DEBUG_TOKEN =
        env.appCheckDebugToken === 'true' ? true : env.appCheckDebugToken
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  }

  auth = getAuth(app)
  // Cache local persistente: visitas repetidas sirven lecturas desde IndexedDB
  // (percepción de carga mucho más rápida en mobile) y toleran cortes de red.
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  googleProvider = new GoogleAuthProvider()

  if (env.useEmulator) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, 'localhost', 8080)
  }
} else {
  auth = undefined as never
  db = undefined as never
  googleProvider = undefined as never
}

export { auth, db, googleProvider }
