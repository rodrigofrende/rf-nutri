import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface PrivacyContextValue {
  blurred: boolean
  toggle: () => void
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null)
const STORAGE_KEY = 'privacy:blurred'

/**
 * "Modo discreto": permite blurear montos y datos sensibles (para compartir
 * pantalla / demos). La elección se persiste en localStorage.
 */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [blurred, setBlurred] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')

  const value = useMemo<PrivacyContextValue>(
    () => ({
      blurred,
      toggle: () =>
        setBlurred((b) => {
          const next = !b
          localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
          return next
        }),
    }),
    [blurred],
  )

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy debe usarse dentro de PrivacyProvider')
  return ctx
}
