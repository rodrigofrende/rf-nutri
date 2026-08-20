import { useState, type ReactNode } from 'react'
import { Menu, MessageSquarePlus, Sparkles } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { cn } from '@/utils/cn'
import { mailtoLink } from '@/utils/contact'
import { APP_NAME, APP_VERSION, PLATFORM_EMAIL } from '@/config/app'
import { WhatsNewModal } from '@/features/whats-new/WhatsNewModal'
import { useWhatsNew } from '@/features/whats-new/useWhatsNew'
import { PageHelp } from '@/components/shared/PageHelp'
import type { PageHelpItem } from '@/content/help'
import { Sidebar } from './Sidebar'

export function AppLayout({
  title,
  subtitle,
  actions,
  help,
  helpTitle,
  children,
}: {
  title: string
  /** Texto/contexto bajo el título (ej. "Últimos 6 meses"). */
  subtitle?: ReactNode
  /** Acciones de la página, alineadas a la derecha del header (ej. botón "Nuevo"). */
  actions?: ReactNode
  help?: PageHelpItem[]
  helpTitle?: string
  children: ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { role, activeMembership, isSuperAdmin } = useTenant()
  const whatsNew = useWhatsNew()

  // Contacto con la plataforma: solo para admins de clinic (el super-admin es RF, no se
  // escribe a sí mismo). Vive en la barra superior —accesible desde cualquier
  // pantalla— en vez de amontonarse en el sidebar.
  //
  // Es un mailto y no un menú propio: un mailto YA es el menú del sistema (en
  // mobile abre el selector nativo de apps de correo), así que un solo link hace
  // lo mismo con una fracción del código.
  const supportHref =
    role === 'admin' && !isSuperAdmin && PLATFORM_EMAIL
      ? mailtoLink(
          PLATFORM_EMAIL,
          `Sugerencia o reporte — ${activeMembership?.clinicName ?? APP_NAME}`,
          // Cuerpo pre-cargado con el contexto que siempre hay que pedir de vuelta.
          // Se deja una línea en blanco arriba para que escriba ahí sin borrar nada.
          `

---
Datos para soporte (no borrar)
Consultorio: ${activeMembership?.clinicName ?? '—'}
Versión: ${APP_VERSION}`,
        )
      : null
  // Novedades: para TODOS los roles, no sólo admins. Antes vivía adentro del menú
  // de Soporte, que está gateado a admins de clinic, así que un paciente nunca podía
  // ver qué cambió. Botón propio para que haya una sola puerta y sea la misma
  // para todos (el contenido se filtra por audiencia dentro del modal).
  const novedades = (
    <button
      type="button"
      onClick={whatsNew.show}
      title="Mirá las novedades de la app"
      aria-label="Novedades de la app"
      className="inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
    >
      <span className="relative shrink-0">
        <Sparkles className="size-5" aria-hidden />
        {whatsNew.hasUnseen && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand-500 ring-2 ring-surface"
          />
        )}
      </span>
      <span className="hidden sm:inline">Novedades</span>
    </button>
  )

  const support = supportHref ? (
    <a
      href={supportHref}
      // El label dice para qué sirve en vez de "Soporte" a secas: es la
      // indicación de que ahí se puede escribir para reportar o pedir algo.
      title="Escribinos si necesitás reportar un problema o pedir una mejora"
      className="inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
    >
      <MessageSquarePlus className="size-5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">Escribinos</span>
    </a>
  ) : null

  const hasHeaderContent = Boolean(subtitle || actions || support || (help && help.length > 0))

  return (
    <div className="flex h-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior solo en mobile: abre el menú y da contexto.
            En desktop el título vive en el header de la página (abajo). */}
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-surface px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="truncate text-base font-semibold text-zinc-900">{title}</h1>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {help && help.length > 0 && <PageHelp items={help} title={helpTitle} compact />}
            {novedades}
            {support}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {/* Header de página unificado: h1 en desktop + subtítulo + acciones.
                En mobile el h1 vive en la barra superior (de ahí `hidden lg:block`).
                El botón de soporte se muestra solo en desktop (en mobile vive arriba). */}
            <div
              className={cn(
                'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:mb-5',
                hasHeaderContent && 'mb-5',
              )}
            >
              <div className="min-w-0">
                <h1 className="hidden text-xl font-bold text-zinc-900 lg:block">{title}</h1>
                {subtitle && <p className="text-sm text-zinc-500 lg:mt-1">{subtitle}</p>}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {help && help.length > 0 && (
                  <div className="hidden lg:block">
                    <PageHelp items={help} title={helpTitle} />
                  </div>
                )}
                {actions}
                <div className="hidden items-center gap-1 lg:flex">
                  {novedades}
                  {support}
                </div>
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>

      <WhatsNewModal open={whatsNew.open} onClose={whatsNew.close} />
    </div>
  )
}
