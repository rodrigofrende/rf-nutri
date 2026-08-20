import {
  Apple,
  Ban,
  Building2,
  CalendarDays,
  CalendarClock,
  LayoutDashboard,
  Layers,
  LineChart,
  MessageSquareHeart,
  NotebookPen,
  Palette,
  Settings,
  Tags,
  User,
  Users,
  UtensilsCrossed,
  Wallet,
  Megaphone,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@/types'
import { ROUTES } from '@/routes/routePaths'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

/** Sección del menú lateral. Sin `label` se renderiza plana (sin título). */
export interface NavGroup {
  key: string
  label?: string
  items: NavItem[]
}

const ADMIN_NAV: NavGroup[] = [
  {
    key: 'gestion',
    label: 'Gestión',
    items: [
      { to: ROUTES.ADMIN_PATIENTS, label: 'Pacientes', icon: Users },
      { to: ROUTES.ADMIN_AGENDA, label: 'Agenda', icon: CalendarDays },
      { to: ROUTES.ADMIN_PAYMENTS, label: 'Cobros', icon: Wallet },
      // Estadísticas al final del grupo: dashboard pesado, la home es Pacientes.
      { to: ROUTES.ADMIN_DASHBOARD, label: 'Estadísticas', icon: LayoutDashboard, end: true },
    ],
  },
  {
    key: 'nutricion',
    label: 'Nutrición',
    items: [
      { to: ROUTES.ADMIN_MEAL_PLANS, label: 'Planes', icon: UtensilsCrossed },
      { to: ROUTES.ADMIN_FOODS, label: 'Alimentos', icon: Apple },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    items: [
      { to: ROUTES.ADMIN_TARIFFS, label: 'Tarifas', icon: Tags },
      { to: ROUTES.ADMIN_MY_CLINIC, label: 'Página pública', icon: Megaphone },
      { to: ROUTES.ADMIN_BRANDING, label: 'Marca', icon: Palette },
      { to: ROUTES.ADMIN_SETTINGS, label: 'Preferencias', icon: Settings },
    ],
  },
]

const USER_NAV: NavGroup[] = [
  {
    key: 'plan',
    label: 'Mi plan',
    items: [
      { to: ROUTES.APP_PLAN, label: 'Plan alimentario', icon: UtensilsCrossed },
      { to: ROUTES.APP_DIARY, label: 'Mi diario', icon: NotebookPen },
      { to: ROUTES.APP_CHECK_IN, label: 'Check-in semanal', icon: MessageSquareHeart },
    ],
  },
  {
    key: 'seguimiento',
    label: 'Mi seguimiento',
    items: [
      { to: ROUTES.APP_PROGRESS, label: 'Mi evolución', icon: LineChart },
      { to: ROUTES.APP_APPOINTMENTS, label: 'Mis turnos', icon: CalendarClock },
      { to: ROUTES.APP_PAYMENTS, label: 'Mis pagos', icon: Wallet },
    ],
  },
  {
    key: 'consultorio',
    label: 'Consultorio',
    items: [
      { to: ROUTES.APP_MY_CLINIC, label: 'Contacto', icon: Building2 },
      { to: ROUTES.APP_PROFILE, label: 'Mi perfil', icon: User },
    ],
  },
]

/** Sección exclusiva del super-admin (cross-tenant). */
export const SUPER_NAV_ITEM: NavItem = {
  to: ROUTES.SUPER_CLINICS,
  label: 'Consultorios',
  icon: Building2,
}

/** Nav de la plataforma RF NUTRI (vistas del super-admin, look general). */
export const PLATFORM_NAV: NavItem[] = [
  { to: ROUTES.SUPER_CLINICS, label: 'Consultorios', icon: Building2 },
  { to: ROUTES.SUPER_PLANS, label: 'Planes', icon: Layers },
  { to: ROUTES.SUPER_BLOCKED, label: 'Emails vetados', icon: Ban },
  { to: ROUTES.SUPER_DASHBOARD, label: 'Panel', icon: LayoutDashboard, end: true },
]

export function navGroupsForRole(role: Role): NavGroup[] {
  return role === 'admin' ? ADMIN_NAV : USER_NAV
}
