import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/providers/AuthProvider'
import { TenantProvider } from '@/providers/TenantProvider'
import { TenantThemeEffect } from '@/providers/TenantThemeEffect'
import { ToastProvider } from '@/providers/ToastProvider'
import { PrivacyProvider } from '@/providers/PrivacyProvider'
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

export default function App() {
  return (
    // Por FUERA de todos los providers a propósito: AuthProvider y TenantProvider
    // son justamente donde un claim raro o un error de permisos puede tirar en
    // render, y adentro no los agarraría. El precio es que la pantalla de error
    // queda por encima del router (no hay navegación blanda), y se paga con los
    // dos botones de navegación dura del boundary.
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PrivacyProvider>
            <ToastProvider>
              <AuthProvider>
                <TenantProvider>
                  <TenantThemeEffect />
                  <AppRoutes />
                </TenantProvider>
              </AuthProvider>
            </ToastProvider>
          </PrivacyProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
