import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { CURRENT_RF_APP, RF_APPS, RF_SITES, type RfProduct } from '@/config/app'

const MENU_WIDTH = 280
const GAP = 8
const MARGIN = 8

const STATUS_LABEL: Record<RfProduct['status'], string> = {
  live: 'Funcionando',
  soon: 'Próximamente',
  building: 'En camino',
}

/**
 * Selector de apps del ecosistema RF: waffle dibujado con la retícula del
 * monograma (tres cuadrados + el cuarto rayado en diagonal, como el logo).
 *
 * Vive SOLO en la landing pública de marketing: nunca en el login ni para
 * usuarios logueados (ahí es ruido, no ecosistema). El panel va en portal
 * fixed por el mismo motivo que ContactMenu/usePopover: la barra estática de
 * la landing cuelga de un `overflow-hidden` que recorta cualquier absolute.
 *
 * Se mantiene POR COPIA en los repos RF (como BrandLockup); la lista de
 * productos vive en config/app.ts.
 */
export function AppSwitcher({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const trigger = wrapRef.current
    if (!trigger) return
    const r = trigger.getBoundingClientRect()
    let left = r.right - MENU_WIDTH
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - MENU_WIDTH - MARGIN)
    setPos({ top: r.bottom + GAP, left })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    place()
    const onReflow = () => place()
    window.addEventListener('resize', onReflow)
    return () => {
      window.removeEventListener('resize', onReflow)
    }
  }, [isOpen, place])

  /**
   * CERRAR AL SCROLLEAR, NO PERSEGUIR LA BARRA.
   *
   * Antes se recalculaba la posición en cada `scroll`, y en un iPhone el panel
   * quedaba un frame atrás de la barra sticky: el toque caía en el hueco y el
   * panel se sentía trabado. Así lo arregló RF FIT (oct 2026), y es el gesto
   * que se espera de un desplegable de header: si la página se va, el panel
   * también.
   *
   * SÓLO SI LA PÁGINA SE MOVIÓ. Un `scroll` sin desplazamiento no lo hizo la
   * persona: lo dispara un `scrollIntoView` o la barra de direcciones de iOS al
   * acomodarse. Y se escucha recién un instante después de abrir, para que el
   * primer layout no lo cierre apenas aparece.
   */
  useEffect(() => {
    if (!isOpen) return
    const yAlAbrir = window.scrollY
    const onScroll = () => {
      if (window.scrollY !== yAlAbrir) setIsOpen(false)
    }
    const timer = window.setTimeout(() => {
      window.addEventListener('scroll', onScroll, { passive: true })
    }, 50)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    /*
      `pointerdown` y no `mousedown`. En un teléfono el `mousedown` de un toque
      es un evento de COMPATIBILIDAD: el navegador lo sintetiza después de
      soltar, y sobre elementos no interactivos iOS puede no emitirlo. O sea que
      "tocar afuera para cerrar", que es como todo el mundo cierra un panel en un
      teléfono, fallaba justo en el iPhone. `pointerdown` es el mismo evento
      para el dedo, el mouse y el lápiz (así lo resolvió rf-dev).
    */
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!wrapRef.current?.contains(t) && !menuRef.current?.contains(t)) setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  return (
    <div ref={wrapRef} className={cn('inline-block', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Apps del estudio RF"
        title="Apps del estudio RF"
        aria-expanded={isOpen}
        // El `active:` es la respuesta al toque: en la landing el recuadro gris
        // de iOS está apagado (`.rf-tacto`), así que sin esto el dedo no vería nada.
        className="flex size-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 active:text-white focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3.5" y="3.5" width="7" height="7"></rect>
          <rect x="13.5" y="3.5" width="7" height="7"></rect>
          <rect x="13.5" y="13.5" width="7" height="7"></rect>
          <path d="M3.5 16.5l3-3"></path>
          <path d="M3.5 20.5l7-7"></path>
          <path d="M7.5 20.5l3-3"></path>
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width: MENU_WIDTH,
            }}
            className={cn(
              // Panel oscuro: es el momento de marca del ecosistema.
              // `rf-tacto` también acá: el panel cuelga del <body> por el portal,
              // así que no hereda el de la landing.
              'rf-tacto rf-panel-in z-[100] rounded-[14px] border border-white/10 bg-zinc-900 p-2 shadow-xl shadow-black/40',
              pos ? '' : 'invisible',
            )}
          >
            {RF_APPS.map((product) => {
              const isCurrent = product.id === CURRENT_RF_APP
              const row = (
                <>
                  <span className={cn('size-2 shrink-0 rounded-full', product.dotClass)} aria-hidden />
                  <span
                    className={cn(
                      'font-display grow text-[15px] tracking-wide uppercase',
                      isCurrent || product.href ? 'text-white' : 'text-zinc-400',
                    )}
                  >
                    {product.name}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-semibold whitespace-nowrap',
                      isCurrent ? 'text-zinc-300' : 'text-zinc-500',
                    )}
                  >
                    {isCurrent ? 'Estás acá' : STATUS_LABEL[product.status]}
                  </span>
                </>
              )
              if (isCurrent) {
                return (
                  <div key={product.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                    {row}
                  </div>
                )
              }
              if (product.href) {
                return (
                  <a
                    key={product.id}
                    href={product.href}
                    role="menuitem"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 active:bg-white/10"
                  >
                    {row}
                  </a>
                )
              }
              return (
                <div key={product.id} className="flex items-center gap-3 px-3 py-2.5 opacity-55">
                  {row}
                </div>
              )
            })}
            {/* Abajo de la línea NO hay productos: está RF. El portfolio y el
                estudio, que son la misma cosa mirada de dos lados.

                RF DEV bajó acá el 18/9/2026, y el motivo lo dio Rodrigo mirando
                el panel: *"no es un SaaS, sino algo más propio para mostrar mi
                experiencia a posibles clientes"*. Arriba estaba listado entre
                cosas que se contratan, con un "Funcionando" al costado — y ese
                estado es una promesa sobre un producto. Un portfolio no está
                "funcionando": está publicado. Por eso acá abajo no lleva dot ni
                estado: son destinos, no productos.

                La línea pasó a ser un `role="separator"` en vez del `border-t`
                que colgaba del último link. Un borde superior sobre una pastilla
                se corta en las esquinas redondeadas, y un borde CSS no se
                anuncia: el corte entre "las apps" y "RF" ahora también existe
                para quien no ve el panel. */}
            <div role="separator" className="mx-3 my-1 h-px bg-white/10" />

            {RF_SITES.map((site) => (
              <a
                key={site.id}
                href={site.href ?? '#'}
                role="menuitem"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 active:bg-white/10"
              >
                <span className="font-display grow text-[15px] tracking-wide text-white uppercase">
                  {site.name}
                </span>
                <ArrowUpRight className="size-3.5 shrink-0 text-zinc-400" />
              </a>
            ))}

            <a
              href="https://rf-platform.com"
              role="menuitem"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-white active:text-white"
            >
              <span className="grow">RF Platform — ver el estudio</span>
              <ArrowUpRight className="size-3.5 shrink-0" />
            </a>
          </div>,
          document.body,
        )}
    </div>
  )
}
