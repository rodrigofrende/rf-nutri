import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Bloquea la navegación in-app y el cierre/recarga de pestaña mientras hay
 * cambios sin guardar. `allowNextNavigation` se usa después de un guardado
 * exitoso que redirige (el state `dirty` todavía no re-renderizó).
 */
export function useUnsavedChanges(dirty: boolean) {
  const bypass = useRef(false)

  const blocker = useBlocker(() => {
    if (bypass.current) {
      bypass.current = false
      return false
    }
    return dirty
  })

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const allowNextNavigation = useCallback(() => {
    bypass.current = true
  }, [])

  const stay = useCallback(() => {
    if (blocker.state === 'blocked') blocker.reset()
  }, [blocker])

  const leave = useCallback(() => {
    if (blocker.state === 'blocked') blocker.proceed()
  }, [blocker])

  return {
    blocked: blocker.state === 'blocked',
    stay,
    leave,
    allowNextNavigation,
  }
}
