import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Membership, Role } from '@/types'
import { useAuth } from './AuthProvider'
import { useMemberships } from '@/hooks/useMemberships'
import { ACTIVE_CLINIC_STORAGE_KEY, persistActiveClinicId } from '@/config/storageKeys'

interface TenantContextValue {
  memberships: Membership[]
  isLoading: boolean
  error: unknown
  activeClinicId: string | null
  activeMembership: Membership | null
  role: Role | null
  isSuperAdmin: boolean
  selectClinic: (clinicId: string) => void
  clearClinic: () => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = useAuth()
  const { data: memberships = [], isLoading, error } = useMemberships(user, isSuperAdmin)
  const [picked, setPicked] = useState<string | null>(() => localStorage.getItem(ACTIVE_CLINIC_STORAGE_KEY))

  const value = useMemo<TenantContextValue>(() => {
    // El clinic activo se DERIVA: la elección persistida si sigue siendo válida,
    // o auto-selección si hay una sola membresía. Sin efectos ni estado duplicado.
    const pickedValid = picked && (isSuperAdmin || memberships.some((m) => m.clinicId === picked))
    const activeClinicId = pickedValid ? picked : memberships.length === 1 ? memberships[0].clinicId : null
    const activeMembership =
      memberships.find((m) => m.clinicId === activeClinicId) ??
      (isSuperAdmin && activeClinicId && user
        ? {
            clinicId: activeClinicId,
            memberId: user.uid,
            clinicName: 'Consultorio',
            role: 'admin',
          }
        : null)

    return {
      memberships,
      isLoading,
      error,
      activeClinicId,
      activeMembership,
      role: activeMembership?.role ?? null,
      isSuperAdmin,
      selectClinic: (clinicId) => {
        setPicked(clinicId)
        persistActiveClinicId(clinicId)
      },
      clearClinic: () => {
        setPicked(null)
        localStorage.removeItem(ACTIVE_CLINIC_STORAGE_KEY)
      },
    }
  }, [memberships, isLoading, error, picked, isSuperAdmin, user])

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOptionalTenant() {
  return useContext(TenantContext)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTenant() {
  const ctx = useOptionalTenant()
  if (!ctx) throw new Error('useTenant debe usarse dentro de TenantProvider')
  return ctx
}
