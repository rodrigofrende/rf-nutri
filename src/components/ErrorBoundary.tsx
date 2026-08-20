import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { reportCrash } from '@/utils/errorReporting'
import { isStaleChunkError, recoverFromStaleDeploy } from '@/utils/staleDeploy'

/**
 * Último cortafuegos del árbol. Sin esto, CUALQUIER error de render desmonta la
 * app entera en React 19: `#root` queda vacío, vuelve el spinner gris del shell
 * (index.html) y el paciente ve un "cargando" eterno que en realidad es un crash.
 *
 * Dos caminos:
 *  - chunk de un deploy viejo → recarga automática (UNA, ver staleDeploy.ts) y
 *    mientras tanto "Actualizando la app…".
 *  - cualquier otro error → pantalla de error de verdad + aviso a ntfy con el
 *    componentStack. Es el ÚNICO camino por el que un error de render llega al
 *    celular del dueño diciendo QUÉ pantalla explotó.
 *
 * LO QUE NO PUEDE ATRAPAR: los throw a nivel de MÓDULO, como el de
 * `src/lib/firebase.ts` cuando faltan credenciales. Eso pasa mientras se importa
 * el grafo de App, antes de que React renderice nada; el único que los ve es el
 * handler global de errorReporting.ts (por eso corre antes de createRoot).
 *
 * Sin dependencias de UI a propósito (ni Button, ni Card, ni lucide): si el crash
 * fue justamente un chunk roto, todo lo que importe acá puede ser lo roto.
 */
type Props = { children: ReactNode }
type State = { phase: 'ok' | 'updating' | 'crashed'; message: string }

export class ErrorBoundary extends Component<Props, State> {
  // Campo de clase, no parameter property: tsconfig tiene erasableSyntaxOnly.
  state: State = { phase: 'ok', message: '' }

  /**
   * Puro: sólo clasifica. React pinta el fallback ENTRE este método y
   * componentDidCatch, así que la decisión "esto se autorrecupera" tiene que
   * estar tomada acá — si no, el primer frame sería la pantalla de error para un
   * caso que en 200ms se recarga solo.
   */
  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error)
    return { phase: isStaleChunkError(message) ? 'updating' : 'crashed', message }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const message = error instanceof Error ? error.message : String(error)
    const detail = info.componentStack || (error instanceof Error ? error.stack : undefined)

    if (isStaleChunkError(message)) {
      const recovery = recoverFromStaleDeploy()
      // 'reloading' incluye el caso "otra capa ya la disparó": la página se está
      // yendo, no pintamos error ni gastamos un aviso.
      if (recovery === 'reloading') return
      // Ya se intentó, o no hay red: el paciente quedó trabado de verdad.
      this.setState({ phase: 'crashed' })
      reportCrash('stale-deploy', message, detail ?? undefined, { recovery })
      return
    }

    console.error('[ErrorBoundary]', error)
    reportCrash('render', message, detail ?? undefined)
  }

  render() {
    const { phase, message } = this.state
    if (phase === 'ok') return this.props.children
    if (phase === 'updating') return <ShellState title="Actualizando la app…" />
    return (
      <ShellState
        title="No pudimos cargar la app"
        detail="Probá recargar. Si sigue igual, revisá tu conexión."
        // Sirve para que el paciente mande una captura útil. Son mensajes de Error,
        // nunca contenido nuestro.
        code={message.slice(0, 120)}
        showActions
      />
    )
  }
}

/** Pantalla mínima y autocontenida (Tailwind del CSS eager, cero imports). */
function ShellState(props: {
  title: string
  detail?: string
  code?: string
  showActions?: boolean
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-base font-semibold text-zinc-900">{props.title}</p>
      {props.detail && <p className="max-w-xs text-sm text-zinc-500">{props.detail}</p>}
      {props.showActions ? (
        <div className="mt-2 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-10 rounded-[var(--radius-control)] bg-brand-600 px-5 text-sm font-medium text-white"
          >
            Recargar
          </button>
          {/* Navegación DURA a propósito: este boundary está por encima del
              router, así que sin esto el paciente no tiene forma de salir. */}
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="h-10 px-4 text-sm font-medium text-zinc-500"
          >
            Ir al inicio
          </button>
        </div>
      ) : (
        <span
          aria-hidden
          className="size-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-400"
        />
      )}
      {props.code && <p className="mt-2 font-mono text-[11px] text-zinc-400">{props.code}</p>}
    </div>
  )
}
