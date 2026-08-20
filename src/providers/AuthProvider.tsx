import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signInWithPopup,
  signOut,
  updateProfile,
  updatePassword,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { env } from '@/config/env'
import { DEMO_IDENTITIES } from '@/demo/seed'
import { setOne } from '@/services/firestore'
import { paths } from '@/services/paths'

export type DemoIdentity = keyof typeof DEMO_IDENTITIES

interface AuthContextValue {
  user: User | null
  isInitialized: boolean
  /** Capacidad global de super-admin, leída del custom claim `superAdmin` del token. */
  isSuperAdmin: boolean
  /**
   * true cuando el custom claim ya fue resuelto. Los claims se resuelven DESPUÉS
   * de isInitialized para no bloquear el primer render (login/check-in) con el
   * parse/refresh del token; solo los guards que dependen de isSuperAdmin esperan.
   */
  claimsResolved: boolean
  loginEmail: (email: string, password: string) => Promise<User>
  registerEmail: (name: string, email: string, password: string) => Promise<User>
  changePassword: (password: string) => Promise<void>
  /**
   * Envía el email de restablecimiento de contraseña de Firebase Auth. Es la
   * forma client-only de resetear una contraseña olvidada: la nueva la define
   * el propio paciente desde el link. Funciona para cualquier admin/super-admin
   * (es una operación de Auth, no depende de las rules de Firestore).
   */
  sendPasswordReset: (email: string) => Promise<void>
  /** Valida el código de una acción de reset (link del email) y devuelve el email asociado. */
  verifyResetCode: (oobCode: string) => Promise<string>
  /** Confirma el reset: aplica el código con la contraseña nueva. */
  confirmReset: (oobCode: string, newPassword: string) => Promise<void>
  /** Actualiza el displayName del usuario y lo persiste en su perfil global. */
  updateDisplayName: (name: string) => Promise<void>
  loginGoogle: () => Promise<void>
  logout: () => Promise<void>
  /** Solo en modo demo: cambia la identidad activa (super-admin ↔ admin ↔ paciente). */
  setDemoIdentity?: (identity: DemoIdentity) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Persiste el perfil global mínimo en `users/{uid}`. */
async function syncUserProfile(user: User) {
  await setOne(paths.user(user.uid), {
    uid: user.uid,
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
  })
}

function identityToUser(identity: DemoIdentity): User {
  const data = DEMO_IDENTITIES[identity]
  return { ...data } as unknown as User
}

/** Provider para modo demo: identidad en memoria, sin Firebase. */
function DemoAuthProvider({ children }: { children: ReactNode }) {
  // Arranca logueado como admin para entrar directo a la app (login bypasseado).
  const [identity, setIdentity] = useState<DemoIdentity | null>('admin')

  const value = useMemo<AuthContextValue>(
    () => ({
      user: identity ? identityToUser(identity) : null,
      isInitialized: true,
      isSuperAdmin: identity === 'superadmin',
      claimsResolved: true,
      loginEmail: async (email) => {
        const next = email.includes('tigerfit.com') ? 'paciente' : 'admin'
        setIdentity(next)
        return identityToUser(next)
      },
      registerEmail: async () => {
        setIdentity('paciente')
        return identityToUser('paciente')
      },
      changePassword: async () => undefined,
      sendPasswordReset: async () => undefined,
      verifyResetCode: async () => 'demo@rf-nutri.app',
      confirmReset: async () => undefined,
      updateDisplayName: async () => undefined,
      loginGoogle: async () => setIdentity('admin'),
      logout: async () => setIdentity(null),
      setDemoIdentity: (next) => setIdentity(next),
    }),
    [identity],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Provider real con Firebase Auth. */
function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [claimsResolved, setClaimsResolved] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      // Inicializamos YA para que login/check-in pinten sin esperar el token.
      // El claim de super-admin se resuelve aparte; HomeRedirect y SuperAdminRoute
      // esperan claimsResolved antes de decidir, así no ven un estado intermedio.
      setUser(u)
      setIsInitialized(true)
      if (!u) {
        setIsSuperAdmin(false)
        setClaimsResolved(true)
        return
      }
      setClaimsResolved(false)
      void u
        .getIdTokenResult()
        .then((token) => setIsSuperAdmin(token.claims.superAdmin === true))
        .catch(() => setIsSuperAdmin(false))
        .finally(() => setClaimsResolved(true))
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitialized,
      isSuperAdmin,
      claimsResolved,
      loginEmail: async (email, password) => {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        return cred.user
      },
      registerEmail: async (name, email, password) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name })
        await syncUserProfile(cred.user)
        return cred.user
      },
      changePassword: async (password) => {
        if (!auth.currentUser) throw new Error('auth/no-current-user')
        await updatePassword(auth.currentUser, password)
      },
      sendPasswordReset: async (email) => {
        // Continue URL: al terminar el reset, la página de Firebase muestra un
        // botón "Continuar" que vuelve al login de la app. Requiere que el dominio
        // esté en Authorized domains; si no lo está, reintentamos SIN el continueUrl
        // para no romper el envío (el botón es un extra, no algo crítico).
        const actionSettings = { url: `${window.location.origin}/login`, handleCodeInApp: false }
        try {
          await sendPasswordResetEmail(auth, email, actionSettings)
        } catch (err) {
          const code = (err as { code?: string } | null)?.code
          if (code === 'auth/unauthorized-continue-uri' || code === 'auth/invalid-continue-uri') {
            await sendPasswordResetEmail(auth, email)
          } else {
            throw err
          }
        }
      },
      verifyResetCode: (oobCode) => verifyPasswordResetCode(auth, oobCode),
      confirmReset: (oobCode, newPassword) => confirmPasswordReset(auth, oobCode, newPassword),
      updateDisplayName: async (name) => {
        if (!auth.currentUser) throw new Error('auth/no-current-user')
        await updateProfile(auth.currentUser, { displayName: name })
        await syncUserProfile(auth.currentUser)
      },
      loginGoogle: async () => {
        const cred = await signInWithPopup(auth, googleProvider)
        await syncUserProfile(cred.user)
      },
      logout: async () => {
        await signOut(auth)
      },
    }),
    [user, isInitialized, isSuperAdmin, claimsResolved],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return env.demoMode ? (
    <DemoAuthProvider>{children}</DemoAuthProvider>
  ) : (
    <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
