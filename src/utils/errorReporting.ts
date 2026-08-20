import { APP_VERSION } from '@/config/app'
import { env } from '@/config/env'
import {
  ACTIVE_CLINIC_STORAGE_KEY,
  DEVICE_ID_KEY,
  REPORTS_SENT_KEY,
  SESSION_ID_KEY,
} from '@/config/storageKeys'
import { emailFingerprint, maskEmail, redactEmails } from './privacy'
import { isStaleChunkError, staleRecoveryFailed } from './staleDeploy'

/**
 * Alertas de errores de producción vía ntfy: push al celular del dueño de la
 * plataforma cuando a un usuario real le explota algo. "Sentry de bolsillo":
 * sin backend ni dependencias, un POST al topic personal.
 *
 * CANAL PÚBLICO. El nombre del topic viaja en el bundle (inevitable sin backend),
 * así que cualquiera que lea el JS puede suscribirse y leer el historial que
 * ntfy.sh cachea, o publicar avisos falsos. De ahí las dos reglas de este módulo:
 *
 *   1) Nada de PII en claro. El email del paciente entra por `context.email` y se
 *      enmascara ACÁ ADENTRO (ver `renderContext`), nunca en el call site: un
 *      solo punto de salida es lo que garantiza que un call site nuevo no filtre
 *      un email por descuido.
 *   2) El querystring se redacta (ver REDACTED_PARAMS): `?email=` y el `oobCode`
 *      de Firebase pasan por la URL, y el segundo es una credencial viva.
 *
 * Si algún día hay backend, el fix estructural es mover el POST al servidor y
 * sacar el topic del bundle.
 */
const NTFY_URL = env.ntfyTopic ? `https://ntfy.sh/${env.ntfyTopic}` : ''

/**
 * Hosts desde los que SÍ se reporta. Es una allowlist a propósito: la denylist
 * anterior sólo excluía `localhost`, así que un `vite preview` en 127.0.0.1, la
 * IP de LAN (probar desde el celular) y cada deploy preview de Netlify
 * reportaban como producción. Con allowlist quedan afuera solos.
 *
 * Si se agrega un dominio de producción, VA ACÁ — si no, los avisos dejan de
 * llegar en silencio.
 */
const REPORTING_HOSTS = new Set(['nutri.rf-platform.com'])

// Anti-spam: por sesión, máximo de envíos y dedupe por mensaje + contexto.
const MAX_PER_SESSION = 5
const seen = new Set<string>()

/**
 * Params cuyo VALOR nunca viaja: el email del paciente (`/set-password?email=`) y
 * los códigos de acción de Firebase (`/auth/action?oobCode=`, que es una
 * credencial de un solo uso todavía válida). Se tapa el valor y se conserva la
 * clave, así se sigue viendo `mode=create`.
 */
const REDACTED_PARAMS = new Set(['email', 'oobcode', 'apikey', 'continueurl', 'token'])

// Ruido conocido que no amerita despertar a nadie.
const IGNORED = [
  /ResizeObserver loop/i,
  // Scripts cross-origin (extensiones, etc.): el navegador oculta el detalle.
  /^Script error\.?$/i,
]
// Los chunks de un deploy viejo YA NO van acá. Estaban descartando EXACTAMENTE el
// error que dejaba a un paciente mirando un spinner gris para siempre: el aviso que
// más falta hacía era el único que se tiraba a la basura. Ahora los maneja
// staleDeploy.ts (una recarga) y se avisan sólo si esa recarga ya falló — ver el
// filtro en report().

/**
 * Contexto estructurado del aviso. `email` es la clave reservada: se pasa CRUDO
 * y este módulo lo enmascara. El resto son pares libres (`mode`, `step`, `clinic`…)
 * que se renderizan como `clave=valor`.
 */
export type ReportContext = {
  /** Email crudo del paciente. Se enmascara en `renderContext`: nunca sale en claro. */
  email?: string
  [key: string]: string | number | boolean | null | undefined
}

// --- storage tolerante a modo privado --------------------------------------
function readStore(kind: 'local' | 'session', key: string): string | null {
  try {
    return (kind === 'local' ? localStorage : sessionStorage).getItem(key)
  } catch {
    return null
  }
}

function writeStore(kind: 'local' | 'session', key: string, value: string) {
  try {
    ;(kind === 'local' ? localStorage : sessionStorage).setItem(key, value)
  } catch {
    /* modo privado: el id vive sólo en memoria */
  }
}

function randomId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  } catch {
    return Math.random().toString(16).slice(2, 10)
  }
}

/** Ids anónimos: `s` por pestaña, `d` por dispositivo. Sólo correlacionan avisos. */
let sessionId = ''
function ids(): { sid: string; did: string } {
  if (!sessionId) {
    sessionId = readStore('session', SESSION_ID_KEY) ?? randomId()
    writeStore('session', SESSION_ID_KEY, sessionId)
  }
  let did = readStore('local', DEVICE_ID_KEY)
  if (!did) {
    did = randomId()
    writeStore('local', DEVICE_ID_KEY, did)
  }
  return { sid: sessionId, did }
}

/** pathname + querystring con los valores sensibles tapados. */
function safeUrl(): string {
  const { pathname, search } = window.location
  if (!search) return pathname
  const out = new URLSearchParams()
  new URLSearchParams(search).forEach((value, key) => {
    out.set(key, REDACTED_PARAMS.has(key.toLowerCase()) ? '***' : value.slice(0, 40))
  })
  return `${pathname}?${out.toString()}`
}

function renderContext(context?: ReportContext): string {
  if (!context) return ''
  const parts: string[] = []
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined || value === null || value === '') continue
    if (key === 'email') {
      // Único lugar donde se toca un email: enmascarado + huella para correlacionar.
      const raw = String(value)
      parts.push(`email=${maskEmail(raw)} hash=${emailFingerprint(raw)}`)
      continue
    }
    parts.push(`${key}=${String(value).slice(0, 80)}`)
  }
  return parts.join(' ')
}

function envLine(): string {
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
  let tz = ''
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    /* sin Intl: no pasa nada */
  }
  return [
    `v${APP_VERSION}`,
    // Mayúscula a propósito: "sin red" es la explicación de la mitad de los avisos.
    navigator.onLine ? 'online' : 'OFFLINE',
    conn?.effectiveType,
    `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`,
    navigator.language,
    tz,
  ]
    .filter(Boolean)
    .join(' · ')
}

function report(
  kind: string,
  message: string,
  detail?: string,
  options?: { priority?: 'high' | 'default'; tags?: string; context?: ReportContext },
) {
  if (!NTFY_URL) return
  if (!import.meta.env.PROD) return
  if (!REPORTING_HOSTS.has(window.location.hostname)) return

  const msg = message || 'Error sin mensaje'
  if (IGNORED.some((re) => re.test(msg))) return

  // Deploy viejo: el dueño de este error es staleDeploy.ts, que lo arregla con UNA
  // recarga. Silencio mientras la recuperación esté disponible o en curso (si no,
  // cada deploy manda un push por cada pestaña vieja que haya en el mundo), y
  // aviso cuando la recarga YA se intentó y el paciente sigue trabado: eso no es
  // ruido, es "mis usuarios no pueden entrar".
  const stale = isStaleChunkError(msg)
  if (stale && !staleRecoveryFailed()) return
  // El mismo fallo entra por hasta tres puertas (ErrorBoundary, window.error /
  // unhandledrejection, onUncaughtError). Normalizar el kind hace que el dedupe
  // de abajo las colapse en UN aviso en vez de tres.
  const alertKind = stale ? 'stale-deploy' : kind

  // El contexto entra en la clave del dedupe: los mensajes son constantes, así
  // que sin esto dos pacientes distintos con el mismo error se colapsaban en UN
  // aviso — justo el caso que interesa ver.
  const ctx = renderContext(options?.context)
  const key = `${alertKind}:${msg.slice(0, 140)}:${ctx}`
  if (seen.has(key)) return

  // Contador persistido por pestaña: un bug que recarga la página no puede
  // mandar el tope completo por recarga (antes era una variable de módulo).
  const sent = Number(readStore('session', REPORTS_SENT_KEY) ?? '0') || 0
  if (sent >= MAX_PER_SESSION) return
  seen.add(key)
  writeStore('session', REPORTS_SENT_KEY, String(sent + 1))

  const { sid, did } = ids()
  const clinicId = readStore('local', ACTIVE_CLINIC_STORAGE_KEY)
  // redactEmails sobre el texto libre: `msg` y `detail` vienen de mensajes de
  // error y stacks que no controlamos, y pueden traer un email embebido. Es el
  // último punto antes del POST, así que cubre TODOS los caminos (los handlers
  // globales, el ErrorBoundary y los reportes de negocio) de una sola vez.
  const body = [
    redactEmails(msg).slice(0, 400),
    detail ? redactEmails(detail).slice(0, 400) : undefined,
    ctx && `ctx: ${ctx}`,
    `url: ${window.location.host}${safeUrl()}`,
    clinicId && `clinic: ${clinicId}`,
    `ses: s=${sid} d=${did} n=${sent + 1}/${MAX_PER_SESSION}`,
    `env: ${envLine()}`,
    `ua: ${navigator.userAgent.slice(0, 160)}`,
  ]
    .filter(Boolean)
    .join('\n')

  // Los datos del usuario van SIEMPRE en el body, nunca en los headers: `kind` es
  // un literal ASCII en todos los call sites, y meter algo con acentos o con un
  // CR/LF en `Title` haría que `fetch` tire TypeError.
  // Fire-and-forget; keepalive para que sobreviva si la página se está cerrando.
  fetch(NTFY_URL, {
    method: 'POST',
    body,
    headers: {
      Title: `RF NUTRI ${!stale && options?.priority === 'default' ? 'aviso' : 'error'} (${alertKind})`,
      // Prioridad alta explícita para stale: llegó acá porque la recuperación
      // automática ya falló, o sea que hay gente sin poder entrar.
      Priority: stale ? 'high' : (options?.priority ?? 'high'),
      Tags: stale ? 'arrows_counterclockwise' : (options?.tags ?? 'rotating_light'),
    },
    keepalive: true,
  }).catch(() => undefined)
}

/**
 * Fallos de negocio ya mostrados al usuario (login, check-in, claim). No son
 * crashes: prioridad baja. El email va crudo en `context.email` y se enmascara
 * adentro; nunca meterlo en `message` ni en `detail`.
 */
export function reportOperational(
  kind: string,
  message: string,
  detail?: string,
  context?: ReportContext,
) {
  report(kind, message, detail, { priority: 'default', tags: 'warning', context })
}

/**
 * Crash: el usuario NO está viendo la app (ErrorBoundary, onUncaughtError).
 * Prioridad alta siempre. `detail` es el componentStack cuando existe: con el
 * bundle minificado y sin sourcemaps es lo único que dice QUÉ pantalla explotó.
 */
export function reportCrash(
  kind: string,
  message: string,
  detail?: string,
  context?: ReportContext,
) {
  report(kind, message, detail, { priority: 'high', tags: 'rotating_light', context })
}

/** Engancha los handlers globales. Llamar una sola vez, al arrancar la app. */
export function initErrorReporting() {
  // Los handlers globales son la red MÁS ANCHA: son los únicos que ven los throw
  // a nivel de MÓDULO (`@/lib/firebase` sin credenciales), que pasan antes de que
  // React monte nada y que por eso ningún ErrorBoundary puede atrapar.
  //
  // Sólo REPORTAN, nunca recuperan: se disparan para todo, y un error que parece
  // stale viniendo de un import() no fatal (un modal lazy) no debería volarle a
  // nadie una pantalla con un formulario a medio llenar. La recarga la deciden
  // lazyPage y el ErrorBoundary, que son los dos lugares donde se SABE que el
  // fallo dejó la pantalla vacía.
  window.addEventListener('error', (e) => {
    report('error', e.message, e.error instanceof Error ? e.error.stack : undefined)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r: unknown = e.reason
    report(
      'promesa',
      r instanceof Error ? r.message : String(r),
      r instanceof Error ? r.stack : undefined,
    )
  })
}
