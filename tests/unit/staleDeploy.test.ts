import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isStaleChunkError } from '@/utils/staleDeploy'

/**
 * La recuperación de deploy viejo recarga la página del paciente sola. Los dos
 * riesgos son simétricos y los dos son caros: no recargar cuando hay que (queda
 * mirando un spinner gris para siempre) y recargar cuando no (loop infinito que
 * le quema los datos). Por eso la guarda va fijada por test.
 */
describe('isStaleChunkError', () => {
  it('reconoce el mensaje de cada motor', () => {
    // El de Safari/iOS es el que originó todo esto (v1.2.0, iPhone, /app/routines).
    expect(isStaleChunkError("TypeError: 'text/html' is not a valid JavaScript MIME type.")).toBe(true)
    expect(isStaleChunkError('Importing a module script failed.')).toBe(true)
    expect(
      isStaleChunkError('Failed to fetch dynamically imported module: https://x/assets/a-1.js'),
    ).toBe(true)
    expect(isStaleChunkError('error loading dynamically imported module')).toBe(true)
    expect(
      isStaleChunkError(
        'Expected a JavaScript module script but the server responded with a MIME type of "text/html"',
      ),
    ).toBe(true)
    expect(isStaleChunkError('Unable to preload CSS for /assets/a-1.css')).toBe(true)
  })

  it('NO matchea errores de red genéricos ni ruido', () => {
    // "Load failed" es el error de fetch genérico de Safari: si lo matcheáramos,
    // cualquier bache de red se convertiría en una recarga.
    expect(isStaleChunkError('Load failed')).toBe(false)
    expect(isStaleChunkError('TypeError: Failed to fetch')).toBe(false)
    expect(isStaleChunkError('ResizeObserver loop completed with undelivered notifications.')).toBe(false)
    expect(isStaleChunkError('')).toBe(false)
  })
})

describe('recoverFromStaleDeploy', () => {
  let reload: ReturnType<typeof vi.fn>
  let store: Map<string, string>

  /**
   * `vi.resetModules()` + `await import()` por caso: el módulo tiene un flag
   * `reloading` a nivel de módulo, así que sin reimportar el segundo test vería
   * el estado del primero.
   */
  async function freshModule() {
    vi.resetModules()
    return import('@/utils/staleDeploy')
  }

  beforeEach(() => {
    store = new Map()
    reload = vi.fn()
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('window', { location: { reload } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('recarga la primera vez', async () => {
    const { recoverFromStaleDeploy } = await freshModule()
    expect(recoverFromStaleDeploy()).toBe('reloading')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('es idempotente dentro del mismo page load', async () => {
    // Importa porque el mismo fallo llega por dos puertas: vite:preloadError
    // primero y el .catch de lazyPage después.
    const { recoverFromStaleDeploy } = await freshModule()
    expect(recoverFromStaleDeploy()).toBe('reloading')
    expect(recoverFromStaleDeploy()).toBe('reloading')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('no vuelve a recargar en un page load posterior dentro de la ventana', async () => {
    const first = await freshModule()
    first.recoverFromStaleDeploy()
    expect(reload).toHaveBeenCalledTimes(1)

    // Simula la recarga: módulo nuevo (flag en cero) pero el sessionStorage
    // sobrevive, que es justo lo que corta el loop.
    const second = await freshModule()
    expect(second.recoverFromStaleDeploy()).toBe('already-tried')
    expect(second.staleRecoveryFailed()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('vuelve a recargar cuando la marca ya expiró', async () => {
    const { recoverFromStaleDeploy } = await freshModule()
    store.set('rf:staleReload', String(Date.now() - 11 * 60 * 1000))
    expect(recoverFromStaleDeploy()).toBe('reloading')
  })

  it('nunca recarga sin red', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const { recoverFromStaleDeploy } = await freshModule()
    expect(recoverFromStaleDeploy()).toBe('offline')
    expect(reload).not.toHaveBeenCalled()
  })

  it('nunca recarga si no puede persistir la guarda', async () => {
    // Sin anti-loop no se recarga: un loop en el celular de un paciente es peor que
    // un botón.
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    })
    const { recoverFromStaleDeploy } = await freshModule()
    expect(recoverFromStaleDeploy()).toBe('already-tried')
    expect(reload).not.toHaveBeenCalled()
  })

  it('staleRecoveryFailed es false sin ningún intento previo', async () => {
    const { staleRecoveryFailed } = await freshModule()
    expect(staleRecoveryFailed()).toBe(false)
  })
})
