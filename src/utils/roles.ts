import type { Member, MemberStatus, Role } from '@/types'

export function isAdmin(role: Role | null | undefined): boolean {
  return role === 'admin'
}

export const STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Activo',
  paused: 'Pausado',
  
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  user: 'Paciente',
}

export interface MemberAccessState {
  label: string
  tone: 'green' | 'amber' | 'neutral'
  /** Qué falta para que el acceso quede activo; null si ya está activo. */
  action: string | null
  /** true cuando requiere una acción/atención del admin o del paciente. */
  needsAttention: boolean
}

/**
 * Estado de ACCESO del paciente (login), independiente del estado de pago:
 * - sin uid / pending_password → todavía no creó su contraseña (primer acceso).
 * - password_change_required → deberá cambiarla en el próximo ingreso.
 * - active → ya tiene acceso normal.
 */
export function memberAccessState(m: Pick<Member, 'uid' | 'authStatus'>): MemberAccessState {
  if (!m.uid || m.authStatus === 'pending_password') {
    return {
      label: 'Primer acceso pendiente',
      tone: 'amber',
      action:
        'Todavía no creó su contraseña. Se activa cuando ingrese por primera vez con su email de acceso.',
      needsAttention: true,
    }
  }
  if (m.authStatus === 'password_change_required') {
    return {
      label: 'Debe cambiar la contraseña',
      tone: 'amber',
      action: 'En su próximo ingreso se le pedirá una contraseña nueva (tiene que recordar la actual).',
      needsAttention: true,
    }
  }
  return { label: 'Acceso activo', tone: 'green', action: null, needsAttention: false }
}
