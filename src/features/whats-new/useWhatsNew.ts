import { useState } from 'react'
import { LATEST_VERSION } from '@/config/changelog'

const STORAGE_KEY = 'rf-nutri.whatsNew.lastSeenVersion'

function readLastSeen(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Estado del modal de novedades + indicador de "hay una versión sin ver".
 * El visto se guarda en localStorage por dispositivo: alcanza para apagar el
 * puntito del botón de Soporte sin sumar lecturas/escrituras a Firestore.
 */
export function useWhatsNew() {
  const [open, setOpen] = useState(false)
  const [hasUnseen, setHasUnseen] = useState(() => readLastSeen() !== LATEST_VERSION)

  const show = () => {
    setOpen(true)
    setHasUnseen(false)
    try {
      localStorage.setItem(STORAGE_KEY, LATEST_VERSION)
    } catch {
      // modo privado / storage lleno: el puntito reaparece la próxima sesión
    }
  }

  return { open, show, close: () => setOpen(false), hasUnseen }
}
