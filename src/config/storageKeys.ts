/**
 * Claves de storage compartidas.
 *
 * Módulo hoja A PROPÓSITO (sin imports): lo usa `src/utils/errorReporting.ts`,
 * que corre en `main.tsx` ANTES de montar la app. Por eso estas constantes no
 * pueden vivir en un provider: importar algo de `TenantProvider` arrastraría
 * `useMemberships` → services → `@/lib/firebase`, que tira un `throw` a nivel de
 * módulo si faltan credenciales — justo el error que el reporter existe para
 * capturar. Se inicializaría Firebase antes que su propio reporter de errores.
 */

/** Consultorio activo elegido por el usuario (lo escribe/lee TenantProvider). */
export const ACTIVE_CLINIC_STORAGE_KEY = 'clinic:activeClinicId'

/**
 * Id anónimo por pestaña. Sirve para correlacionar varios avisos del mismo
 * intento y para distinguir "un paciente reintentando 3 veces" de "3 pacientes".
 */
export const SESSION_ID_KEY = 'rf:sid'

/**
 * Id anónimo por dispositivo. Responde "¿es el mismo celular que el aviso de
 * ayer?". Es un id de diagnóstico, no de tracking: 8 hex random sin ninguna
 * relación con el paciente ni con su cuenta.
 */
export const DEVICE_ID_KEY = 'rf:did'

/**
 * Avisos ya enviados en esta pestaña. Persistido (no una variable de módulo)
 * para que un bug que recarga la página no mande el tope completo por recarga.
 */
export const REPORTS_SENT_KEY = 'rf:reportsSent'

/**
 * Marca de "ya intenté recuperarme de un deploy viejo" (ver
 * `src/utils/staleDeploy.ts`). Va en sessionStorage —por pestaña— a propósito: en
 * localStorage, una pestaña que falló bloquearía la recuperación de las otras y
 * la marca sobreviviría al cierre del navegador.
 */
export const STALE_RELOAD_KEY = 'rf:staleReload'
