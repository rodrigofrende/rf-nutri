import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { FullPageSpinner } from '@/components/ui'
// Eager: solo el camino crítico del primer acceso (login → crear contraseña →
// elegir consultorio). Todo lo demás es lazy para que un paciente en mobile no
// descargue el panel admin/super antes de ver el login.
import { LoginPage } from '@/features/auth/LoginPage'
import { SetPasswordPage } from '@/features/auth/SetPasswordPage'
import { TenantSelectPage } from '@/features/tenant-select/TenantSelectPage'
import { PrivateRoute, SuperAdminRoute } from './PrivateRoute'
import { defaultHomeForRole, ROUTES } from './routePaths'
import { isStaleChunkError, recoverFromStaleDeploy } from '@/utils/staleDeploy'

/**
 * Lazy para páginas con named export.
 *
 * El `.catch` es el punto MÁS TEMPRANO donde se puede atajar un deploy viejo: acá
 * el fallo todavía es una promesa rechazada y React ni se enteró. Si recuperamos,
 * devolvemos una promesa que NUNCA resuelve, así <Suspense> se queda con el
 * spinner los ~200ms hasta que la recarga se lleva la página — en vez de
 * re-lanzar, hacer que React descarte el árbol entero y dejar `#root` vacío, que
 * es lo que hacía reaparecer el spinner gris del shell para siempre.
 */
function lazyPage<M>(load: () => Promise<M>, pick: (m: M) => ComponentType) {
  return lazy(() =>
    load()
      .then((m) => ({ default: pick(m) }))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        if (isStaleChunkError(message) && recoverFromStaleDeploy() === 'reloading') {
          return new Promise<{ default: ComponentType }>(() => {})
        }
        // Otro error, o recuperación ya agotada / sin red: que suba al
        // ErrorBoundary, que sabe pintar algo y avisar.
        throw error
      }),
  )
}

// Panel admin (el dashboard además trae recharts)
const AdminDashboardPage = lazyPage(() => import('@/features/admin/dashboard/AdminDashboardPage'), (m) => m.AdminDashboardPage)
const PatientsListPage = lazyPage(() => import('@/features/admin/patients/PatientsListPage'), (m) => m.PatientsListPage)
const PatientDetailPage = lazyPage(() => import('@/features/admin/patients/PatientDetailPage'), (m) => m.PatientDetailPage)
const MealPlansListPage = lazyPage(() => import('@/features/admin/meal-plans/MealPlansListPage'), (m) => m.MealPlansListPage)
const MealPlanEditorPage = lazyPage(() => import('@/features/admin/meal-plans/MealPlanEditorPage'), (m) => m.MealPlanEditorPage)
const FoodsListPage = lazyPage(() => import('@/features/admin/foods/FoodsListPage'), (m) => m.FoodsListPage)
const AgendaPage = lazyPage(() => import('@/features/admin/agenda/AgendaPage'), (m) => m.AgendaPage)
const PaymentsHistoryPage = lazyPage(() => import('@/features/admin/payments/PaymentsHistoryPage'), (m) => m.PaymentsHistoryPage)
const TariffsListPage = lazyPage(() => import('@/features/admin/tariffs/TariffsListPage'), (m) => m.TariffsListPage)
const ClinicSettingsPage = lazyPage(() => import('@/features/admin/settings/ClinicSettingsPage'), (m) => m.ClinicSettingsPage)
const BrandingPage = lazyPage(() => import('@/features/admin/branding/BrandingPage'), (m) => m.BrandingPage)
const MyClinicPage = lazyPage(() => import('@/features/admin/my-clinic/MyClinicPage'), (m) => m.MyClinicPage)
// Paciente
const MyPlanPage = lazyPage(() => import('@/features/patient/plan/MyPlanPage'), (m) => m.MyPlanPage)
const DiaryPage = lazyPage(() => import('@/features/patient/diary/DiaryPage'), (m) => m.DiaryPage)
const CheckInPage = lazyPage(() => import('@/features/patient/check-in/CheckInPage'), (m) => m.CheckInPage)
const MyProgressPage = lazyPage(() => import('@/features/patient/progress/MyProgressPage'), (m) => m.MyProgressPage)
const MyAppointmentsPage = lazyPage(() => import('@/features/patient/appointments/MyAppointmentsPage'), (m) => m.MyAppointmentsPage)
const MyPaymentsPage = lazyPage(() => import('@/features/patient/payments/MyPaymentsPage'), (m) => m.MyPaymentsPage)
const ProfilePage = lazyPage(() => import('@/features/patient/profile/ProfilePage'), (m) => m.ProfilePage)
const MyClinicMemberPage = lazyPage(() => import('@/features/patient/my-clinic/MyClinicMemberPage'), (m) => m.MyClinicMemberPage)
// Acción de email (reset de contraseña) con página propia branded. Lazy: solo
// se llega desde el link del email, no es camino crítico del primer acceso.
const AuthActionPage = lazyPage(() => import('@/features/auth/AuthActionPage'), (m) => m.AuthActionPage)
// Pública y super-admin
const PublicClinicPage = lazyPage(() => import('@/features/public/PublicClinicPage'), (m) => m.PublicClinicPage)
const LandingPage = lazyPage(() => import('@/features/landing/LandingPage'), (m) => m.LandingPage)
const SuperClinicsPage = lazyPage(() => import('@/features/super/SuperClinicsPage'), (m) => m.SuperClinicsPage)
const SuperDashboardPage = lazyPage(() => import('@/features/super/SuperDashboardPage'), (m) => m.SuperDashboardPage)
const PlansListPage = lazyPage(() => import('@/features/super/PlansListPage'), (m) => m.PlansListPage)
const BlockedEmailsPage = lazyPage(() => import('@/features/super/BlockedEmailsPage'), (m) => m.BlockedEmailsPage)

/** Decide la home según el estado de auth/rol para la ruta raíz. */
function HomeRedirect() {
  const { user, isInitialized, claimsResolved } = useAuth()
  const { isLoading, role, isSuperAdmin } = useTenant()
  if (!isInitialized) return <FullPageSpinner />
  // Visitante sin sesión: landing de marketing de la plataforma, sin esperar
  // claims ni tenant (que un prospecto no pague spinners de auth).
  if (!user) return <LandingPage />
  // claimsResolved: necesario porque la decisión depende de isSuperAdmin.
  if (isLoading || !claimsResolved) return <FullPageSpinner />
  if (isSuperAdmin) return <Navigate to={defaultHomeForRole(null, { isSuperAdmin: true })} replace />
  if (!role) return <Navigate to={ROUTES.SELECT_CLINIC} replace />
  return <Navigate to={defaultHomeForRole(role)} replace />
}

/** Rutas del admin: mismo guard en todas. */
function adminRoute(element: React.ReactNode) {
  return <PrivateRoute allowedRoles={['admin']}>{element}</PrivateRoute>
}

/** Rutas del paciente: sin gate de pagos (los cobros no bloquean el acceso). */
function patientRoute(element: React.ReactNode) {
  return <PrivateRoute allowedRoles={['user']}>{element}</PrivateRoute>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SET_PASSWORD} element={<SetPasswordPage />} />
        <Route path={ROUTES.AUTH_ACTION} element={<AuthActionPage />} />
        <Route path={ROUTES.PUBLIC_CLINIC} element={<PublicClinicPage />} />
        <Route path={ROUTES.SELECT_CLINIC} element={<TenantSelectPage />} />

        {/* Super-admin (plataforma RF NUTRI) */}
        <Route
          path={ROUTES.SUPER_DASHBOARD}
          element={
            <SuperAdminRoute>
              <SuperDashboardPage />
            </SuperAdminRoute>
          }
        />
        <Route
          path={ROUTES.SUPER_CLINICS}
          element={
            <SuperAdminRoute>
              <SuperClinicsPage />
            </SuperAdminRoute>
          }
        />
        <Route
          path={ROUTES.SUPER_PLANS}
          element={
            <SuperAdminRoute>
              <PlansListPage />
            </SuperAdminRoute>
          }
        />
        <Route
          path={ROUTES.SUPER_BLOCKED}
          element={
            <SuperAdminRoute>
              <BlockedEmailsPage />
            </SuperAdminRoute>
          }
        />

        {/* Admin (nutricionista) */}
        <Route path={ROUTES.ADMIN_DASHBOARD} element={adminRoute(<AdminDashboardPage />)} />
        <Route path={ROUTES.ADMIN_PATIENTS} element={adminRoute(<PatientsListPage />)} />
        <Route path={ROUTES.ADMIN_PATIENT_DETAIL} element={adminRoute(<PatientDetailPage />)} />
        <Route path={ROUTES.ADMIN_MEAL_PLANS} element={adminRoute(<MealPlansListPage />)} />
        <Route path={ROUTES.ADMIN_MEAL_PLAN_NEW} element={adminRoute(<MealPlanEditorPage />)} />
        <Route path={ROUTES.ADMIN_MEAL_PLAN_DETAIL} element={adminRoute(<MealPlanEditorPage />)} />
        <Route path={ROUTES.ADMIN_FOODS} element={adminRoute(<FoodsListPage />)} />
        <Route path={ROUTES.ADMIN_AGENDA} element={adminRoute(<AgendaPage />)} />
        <Route path={ROUTES.ADMIN_PAYMENTS} element={adminRoute(<PaymentsHistoryPage />)} />
        <Route path={ROUTES.ADMIN_TARIFFS} element={adminRoute(<TariffsListPage />)} />
        <Route path={ROUTES.ADMIN_SETTINGS} element={adminRoute(<ClinicSettingsPage />)} />
        <Route path={ROUTES.ADMIN_BRANDING} element={adminRoute(<BrandingPage />)} />
        <Route path={ROUTES.ADMIN_MY_CLINIC} element={adminRoute(<MyClinicPage />)} />

        {/* Paciente */}
        <Route path={ROUTES.APP_PLAN} element={patientRoute(<MyPlanPage />)} />
        <Route path={ROUTES.APP_DIARY} element={patientRoute(<DiaryPage />)} />
        <Route path={ROUTES.APP_CHECK_IN} element={patientRoute(<CheckInPage />)} />
        <Route path={ROUTES.APP_PROGRESS} element={patientRoute(<MyProgressPage />)} />
        <Route path={ROUTES.APP_APPOINTMENTS} element={patientRoute(<MyAppointmentsPage />)} />
        <Route path={ROUTES.APP_PAYMENTS} element={patientRoute(<MyPaymentsPage />)} />
        <Route path={ROUTES.APP_PROFILE} element={patientRoute(<ProfilePage />)} />
        <Route path={ROUTES.APP_MY_CLINIC} element={patientRoute(<MyClinicMemberPage />)} />

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
