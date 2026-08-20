import { Badge, Modal } from '@/components/ui'
import { CHANGELOG, LATEST_VERSION, type ChangeKind } from '@/config/changelog'
import { useTenant } from '@/providers/TenantProvider'

/**
 * El tipo se muestra como punto de color + palabra, no como badge: en mobile un
 * badge por ítem obligaba a un gutter izquierdo de ~86px, y como "Arreglo" es más
 * ancho que "Nuevo" el texto arrancaba en distinta posición en cada línea.
 */
const KIND_META: Record<ChangeKind, { label: string; dot: string; text: string }> = {
  new: { label: 'Nuevo', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  improved: { label: 'Mejora', dot: 'bg-violet-500', text: 'text-violet-700' },
  fixed: { label: 'Arreglo', dot: 'bg-amber-500', text: 'text-amber-700' },
}

/** Fecha YYYY-MM-DD → "17 ago 2026" sin corrimiento de zona horaria. */
function formatReleaseDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(y, m - 1, d))
}

/** Listado de versiones (la más nueva primero) con sus mejoras en lenguaje simple. */
export function WhatsNewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role, isSuperAdmin } = useTenant()
  const seesAdminItems = role === 'admin' || isSuperAdmin

  // Un paciente no ve las novedades de pantallas de gestión: no son suyas y sólo
  // agregan ruido. Las versiones que quedan sin items se omiten enteras, para no
  // mostrar una versión vacía.
  const releases = CHANGELOG.map((release) => ({
    ...release,
    items: release.items.filter((item) => seesAdminItems || item.audience !== 'admin'),
  })).filter((release) => release.items.length > 0)

  return (
    <Modal open={open} onClose={onClose} title="Novedades">
      <div className="space-y-5">
        {releases.map((release) => (
          <section key={release.version}>
            {/* La línea inferior separa los grupos mejor que el espacio solo: con
                varias versiones seguidas, el ojo encontraba el corte tarde. */}
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
              <h3 className="text-sm font-bold text-zinc-900">Versión {release.version}</h3>
              {/* Contra LATEST_VERSION y no contra el índice: al filtrar por
                  audiencia, la primera versión que ve un paciente puede no ser la
                  actual. */}
              {release.version === LATEST_VERSION && <Badge tone="green">Actual</Badge>}
              <span className="ml-auto shrink-0 text-xs text-zinc-400">
                {formatReleaseDate(release.date)}
              </span>
            </div>
            <ul className="mt-3 space-y-4">
              {release.items.map((item, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className={`size-1.5 shrink-0 rounded-full ${KIND_META[item.kind].dot}`}
                    />
                    <span className={`text-xs font-semibold ${KIND_META[item.kind].text}`}>
                      {KIND_META[item.kind].label}
                    </span>
                    {/* Sólo se marca la EXCEPCIÓN. Antes cada ítem llevaba también
                        su audiencia, y como la mayoría son para todos, "Paciente" se
                        repetía en 8 de 13 filas sin aportar nada. Un paciente nunca
                        ve estos ítems, así que este tag es de hecho sólo para el
                        admin sin necesidad de condicionarlo por rol. */}
                    {item.audience === 'admin' && <Badge tone="sky">Solo admins</Badge>}
                  </span>
                  {/* Sin gutter: el texto usa el ancho completo del modal, que en
                      390px es la diferencia entre 4 líneas y 6. */}
                  <span className="text-pretty text-sm leading-relaxed text-zinc-700">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}
