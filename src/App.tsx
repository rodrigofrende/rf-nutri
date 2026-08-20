import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/providers/AuthProvider'
import { TenantProvider } from '@/providers/TenantProvider'
import { TenantThemeEffect } from '@/providers/TenantThemeEffect'
import { ToastProvider } from '@/providers/ToastProvider'
import { AppRoutes } from '@/routes/AppRoutes'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { isNonRetryableError } from '@/utils/firestoreErrors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No reintentar errores de permisos/sesión: el retry no los va a arreglar
      // y suma lecturas de Firestore al pedo.
      retry: (failureCount, error) => !isNonRetryableError(error) && failureCount < 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
})

/**
 * Árbol de la app. Vive en una ruta splat del data router para que `useBlocker`
 * (cambios sin guardar) funcione; el matching de URLs lo sigue haciendo AppRoutes.
 */
function AppTree() {
  return (
    <ToastProvider>
      <AuthProvider>
        <TenantProvider>
          <TenantThemeEffect />
          <AppRoutes />
        </TenantProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

const router = createBrowserRouter([{ path: '*', element: <AppTree /> }])

export default function App() {
  return (
    // Por FUERA de todos los providers a propósito: AuthProvider y TenantProvider
    // son justamente donde un claim raro o un error de permisos puede tirar en
    // render, y adentro no los agarraría. El precio es que la pantalla de error
    // queda por encima del router (no hay navegación blanda), y se paga con los
    // dos botones de navegación dura del boundary.
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

