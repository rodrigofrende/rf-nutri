/**
 * Historial de novedades que ve CUALQUIER usuario (pacientes incluidos) desde el
 * botón de Novedades.
 *
 * CÓMO SE ESCRIBE. Es lo primero que un paciente lee de nosotros, así que se escribe
 * como se le habla a una persona, no como se documenta un commit:
 *  - **El beneficio primero.** Qué puede hacer ahora, o qué dejó de sufrir. No
 *    qué tocamos nosotros. "Ya no te dice que tu email no existe" y no "se
 *    corrigió la validación del índice".
 *  - **Voseo, frases cortas, cero jerga.** Si aparece la palabra caché, índice,
 *    chunk, batch o validación, está mal escrito.
 *  - **Pocas líneas y contundentes.** Mejor 3 que se entienden que 8 que se
 *    hojean. Si dos arreglos se viven como una sola mejora, van juntos.
 *  - **Nada invisible.** Si el usuario no lo puede ver ni sentir, no va: los
 *    refactors, los tests y la observabilidad no son novedades.
 *
 * QUÉ NO VA, además: detalles internos, la forma de un bug que alguien pueda
 * aprovechar, y nada que sugiera que hubo datos en un estado inconsistente. Ante
 * la duda, contá el síntoma que dejó de pasar, no la causa.
 *
 * Al sacar una versión: agregar la entrada acá (la más nueva PRIMERO) y
 * mantener `version` en sync con package.json. El punto de "hay novedades"
 * del botón de Novedades se enciende solo comparando contra la primera entrada.
 */
export type ChangeKind = 'new' | 'improved' | 'fixed'

export interface ChangelogItem {
  kind: ChangeKind
  text: string
  /**
   * 'admin' → solo lo ven los admins del clinic. Omitido = lo ve TODO el mundo,
   * pacientes incluidos (Novedades es accesible para todos los roles).
   *
   * Usalo para lo que pasa en pantallas de gestión: a un paciente, "la lista de
   * pacientes ahora muestra el vencimiento" no le dice nada.
   */
  audience?: 'admin'
}

export interface ChangelogRelease {
  version: string
  /** Fecha de la release como YYYY-MM-DD (se formatea al mostrar). */
  date: string
  items: ChangelogItem[]
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: '0.1.0',
    date: '2026-08-20',
    items: [
      {
        kind: 'new',
        text: 'Nace RF NUTRI: tu consultorio online. Pacientes, planes alimentarios, antropometria, turnos y cobros, todo en un solo lugar.',
      },
      {
        kind: 'new',
        text: 'Tus pacientes tienen su propia app: ven su plan, registran sus comidas y su peso, y completan el check-in semanal.',
      },
    ],
  },
]

/** La versión "actual": el badge y el puntito de novedades sin ver comparan contra esta. */
export const LATEST_VERSION = CHANGELOG[0]?.version ?? ''
