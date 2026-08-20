import { STALE_RELOAD_KEY } from '@/config/storageKeys'

/**
 * Recuperación de "deploy viejo".
 *
 * El caso real: una pestaña de iOS Safari abierta días con el bundle v1.2.0 en
 * memoria, se deployó v1.2.2, y el chunk hasheado de una ruta lazy que esa
 * pestaña todavía no había pedido ya no existe. El `import()` falla, React 19
 * descarta TODO el árbol, `#root` queda vacío y reaparece el spinner gris del
 * shell (index.html): un crash disfrazado de "cargando" eterno.
 *
 * El arreglo es UNA recarga: trae el index.html nuevo con los hashes nuevos. No
 * hay service worker ni Cache API en la app, así que no hay nada más que limpiar.
 *
 * MÓDULO HOJA a propósito: sólo importa `@/config/storageKeys`. No puede importar
 * `errorReporting` (sería un ciclo: ese módulo importa a este) ni nada que
 * arrastre `@/lib/firebase`, que tira un throw a nivel de módulo. Este módulo
 * RECUPERA; avisar es problema de otro.
 */

/**
 * "El chunk que pedí ya no existe / no es JS". Un patrón por motor, porque el
 * mismo fallo se llama distinto en cada uno:
 *   Chrome/Edge  "Failed to fetch dynamically imported module: <url>"
 *   Firefox      "error loading dynamically imported module"
 *   Safari/iOS   "Importing a module script failed."
 *   Safari/iOS   "'text/html' is not a valid JavaScript MIME type"   ← el host devolvía index.html
 *   Chrome       "Expected a JavaScript module script but the server responded with a MIME type of "text/html""
 *   Vite         "Unable to preload CSS for <url>"                    ← el CSS del chunk, no el JS
 *
 * NO se agrega el "Load failed" genérico de Safari: matchearía cualquier fetch
 * caído y convertiría un bache de red en una recarga.
 */
const STALE_CHUNK_PATTERNS = [
  /dynamically imported module/i,
  /Importing a module script failed/i,
  /not a valid JavaScript MIME type/i,
  /Expected a JavaScript.*MIME type/i,
  /Unable to preload CSS/i,
]

/**
 * Ventana del anti-loop. Tiene que ser MÁS LARGA que el ciclo completo
 * "recargar → bootear → volver a crashear" incluso en 3G malo (~20-30s): si no,
 * un deploy realmente roto (el chunk 404ea de verdad, no es una pestaña vieja)
 * genera recarga → crash → recarga infinita, quemándole los datos al paciente. Y
 * tiene que ser CORTA para que quien vuelve un rato después, tras OTRO deploy,
 * todavía tenga derecho a su recarga automática. 10 minutos: ~20x el peor ciclo,
 * y no se come el segundo deploy del día.
 */
const GUARD_WINDOW_MS = 10 * 60 * 1000

/** ¿Este mensaje es "el chunk que pedí ya no existe / no es JS"? */
export function isStaleChunkError(message: string): boolean {
  return STALE_CHUNK_PATTERNS.some((re) => re.test(message))
}

function readGuardAt(): number | null {
  try {
    const raw = sessionStorage.getItem(STALE_RELOAD_KEY)
    if (!raw) return null
    const at = Number(raw)
    return Number.isFinite(at) ? at : null
  } catch {
    return null
  }
}

/**
 * Escribe la marca y la VERIFICA leyéndola de vuelta: sin marca persistida no hay
 * anti-loop, y sin anti-loop no se recarga (ver abajo).
 */
function writeGuardVerified(at: number): boolean {
  const value = String(at)
  try {
    sessionStorage.setItem(STALE_RELOAD_KEY, value)
    return sessionStorage.getItem(STALE_RELOAD_KEY) === value
  } catch {
    return false
  }
}

/**
 * Ya hay una recarga disparada en ESTE page load. Necesario porque el mismo error
 * llega por dos caminos: el helper de preload de Vite dispara `vite:preloadError`
 * y DESPUÉS re-tira el error (`if (!e.defaultPrevented) throw e`), así que
 * `recoverFromStaleDeploy()` se llama dos veces por el mismo fallo. Sin este flag
 * la segunda devolvería 'already-tried' y el ErrorBoundary pintaría la pantalla
 * de error justo cuando la recarga ya estaba en camino.
 */
let reloading = false

/**
 * 'offline' es un estado propio a propósito: sin red el import falla con el MISMO
 * mensaje que un deploy viejo ("Importing a module script failed" en Safari), y
 * ahí recargar no arregla nada y encima tira abajo una sesión que funcionaba.
 */
export type StaleRecovery = 'reloading' | 'already-tried' | 'offline'

/** Recuperación de un solo tiro, guardada. Idempotente dentro del page load. */
export function recoverFromStaleDeploy(): StaleRecovery {
  if (reloading) return 'reloading'
  // navigator.onLine es confiable en negativo: false = seguro no hay red.
  if (!navigator.onLine) return 'offline'

  const previous = readGuardAt()
  if (previous !== null && Date.now() - previous < GUARD_WINDOW_MS) return 'already-tried'

  // Sin storage (modo privado bloqueado, Lockdown) no hay red de seguridad, y un
  // loop de recargas en el celular de un paciente es MUCHO peor que un botón.
  if (!writeGuardVerified(Date.now())) return 'already-tried'

  reloading = true
  // reload() y NO location.replace() con cache-buster: el shell se sirve sin
  // caché, así que la recarga ya trae los hashes nuevos. Un `?v=` ensuciaría
  // rutas donde el querystring SÍ significa algo (`/set-password?email=`,
  // `/auth/action?oobCode=`), quedaría en el historial y en lo que el paciente
  // comparte, y `safeUrl()` del reporter empezaría a loguearlo.
  window.location.reload()
  return 'reloading'
}

/**
 * Hubo un intento de recuperación en un page load ANTERIOR y el usuario SIGUE
 * viendo el error. Eso ya no es ruido de deploy: es "mis pacientes no pueden
 * entrar". Lo consume errorReporting.ts para decidir si avisa.
 *
 * OJO: la marca NUNCA se limpia al bootear bien, sólo expira por tiempo. Después
 * de recargar, el router restaura la MISMA URL y la ruta que crasheaba se vuelve
 * a renderizar sola; si limpiáramos la marca al montar, un deploy realmente roto
 * daría boot → limpiar → crash → recarga → para siempre.
 */
export function staleRecoveryFailed(): boolean {
  if (reloading) return false
  const previous = readGuardAt()
  return previous !== null && Date.now() - previous < GUARD_WINDOW_MS
}

/**
 * Red de seguridad para `import()` que NO pase por `lazyPage`. Hoy los imports
 * dinámicos de src/ están todos en AppRoutes.tsx, así que esto es para el futuro:
 * el día que alguien importe una lib pesada dentro de una feature, queda cubierto
 * sin tener que acordarse de nada.
 *
 * NO se llama `event.preventDefault()`. Vite hace `if (!e.defaultPrevented) throw e`
 * y el resultado de ese catch es el valor con el que resuelve el import: si se
 * cancela, `import()` resuelve `undefined` y el error real se transforma en un
 * "Cannot read properties of undefined" imposible de diagnosticar. Que Vite lo
 * re-tire es lo que queremos: lo agarra el .catch de lazyPage.
 */
export function initStaleDeployRecovery() {
  window.addEventListener('vite:preloadError', (event) => {
    if (isStaleChunkError(event.payload?.message ?? '')) recoverFromStaleDeploy()
  })
}
