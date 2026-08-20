import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { afterAll, assert, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'

/**
 * Tests de seguridad de firestore.rules contra el emulador. Verifican que un
 * actor malicioso NO pueda: auto-cambiarse el plan/facturación, inflar el
 * ranking sin techo, leer/escribir datos de otro clinic, o auto-promoverse a admin.
 *
 * Correr con: pnpm test:rules  (levanta el emulador de Firestore; necesita Java).
 */

const CLINIC = 'clinicA'
const OTHER_CLINIC = 'clinicB'
const ADMIN_UID = 'admin-uid'
const SOCIO_UID = 'paciente-uid'
const SOCIO_MEMBER = 'paciente-member'
const OUTSIDER_UID = 'outsider-uid'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  const rulesPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'firestore.rules')
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rf-fit-rules',
    firestore: { rules: readFileSync(rulesPath, 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  // Semilla de base con privilegios elevados (sin pasar por las rules).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, `clinics/${CLINIC}`), {
      name: 'Clinic A',
      ownerUid: ADMIN_UID,
      adminUids: [ADMIN_UID],
      subscription: { planId: 'tier-inicial', monthlyCost: 9999, status: 'active' },
    })
    await setDoc(doc(db, `clinics/${CLINIC}/members/${SOCIO_MEMBER}`), {
      uid: SOCIO_UID,
      email: 'paciente@clinicA.com',
      role: 'user',
      fullName: 'Rodrigo Frende',
      status: 'active',
    })
    await setDoc(doc(db, `clinics/${OTHER_CLINIC}`), {
      name: 'Clinic B',
      ownerUid: 'other-admin',
      adminUids: ['other-admin'],
      subscription: { planId: 'tier-inicial', monthlyCost: 9999, status: 'active' },
    })
  })
})

// Contextos de auth reutilizables.
const asAdmin = () => testEnv.authenticatedContext(ADMIN_UID).firestore()
const asSocio = () => testEnv.authenticatedContext(SOCIO_UID).firestore()
const asOutsider = () => testEnv.authenticatedContext(OUTSIDER_UID).firestore()
const asSuper = () =>
  testEnv.authenticatedContext('super-uid', { superAdmin: true }).firestore()

describe('clinics — facturación y propiedad son solo del super-admin', () => {
  it('el admin NO puede auto-cambiarse el plan (subscription)', async () => {
    const db = asAdmin()
    await assertFails(
      updateDoc(doc(db, `clinics/${CLINIC}`), {
        subscription: { planId: 'tier-premium', monthlyCost: 0, status: 'active' },
      }),
    )
  })

  it('el admin NO puede cambiar ownerUid (robar el clinic)', async () => {
    const db = asAdmin()
    await assertFails(updateDoc(doc(db, `clinics/${CLINIC}`), { ownerUid: ADMIN_UID + '-nuevo' }))
  })

  it('el admin SÍ puede editar branding (name / theme)', async () => {
    const db = asAdmin()
    await assertSucceeds(updateDoc(doc(db, `clinics/${CLINIC}`), { name: 'Clinic A Renovado' }))
  })

  it('el super-admin SÍ puede cambiar la subscription', async () => {
    const db = asSuper()
    await assertSucceeds(
      updateDoc(doc(db, `clinics/${CLINIC}`), {
        subscription: { planId: 'tier-premium', monthlyCost: 50000, status: 'active' },
      }),
    )
  })

  it('un forastero no puede leer ni escribir el clinic', async () => {
    const db = asOutsider()
    await assertFails(getDoc(doc(db, `clinics/${CLINIC}`)))
    await assertFails(updateDoc(doc(db, `clinics/${CLINIC}`), { name: 'hackeado' }))
  })
})

describe('plans — lectura pública, escritura solo super-admin', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'plans/tier-inicial'), { name: 'Entrada en Calor', price: 9999 })
    })
  })

  it('cualquiera (sin login) puede leer los planes', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, 'plans/tier-inicial')))
  })

  it('un admin NO puede crear/editar planes', async () => {
    const db = asAdmin()
    await assertFails(setDoc(doc(db, 'plans/hackeado'), { name: 'Gratis', price: 0 }))
  })

  it('el super-admin SÍ puede escribir planes', async () => {
    const db = asSuper()
    await assertSucceeds(setDoc(doc(db, 'plans/nuevo'), { name: 'Nuevo', price: 1 }))
  })
})

describe('attendanceMonthly — el ranking no se puede inflar sin techo', () => {
  const entryId = `2026-08_${SOCIO_MEMBER}`
  const base = {
    monthKey: '2026-08',
    memberId: SOCIO_MEMBER,
    memberUid: SOCIO_UID,
    displayName: 'Rodrigo F.',
  }

  it('el paciente puede crear su contador con days = 1', async () => {
    const db = asSocio()
    await assertSucceeds(setDoc(doc(db, `clinics/${CLINIC}/attendanceMonthly/${entryId}`), { ...base, days: 1 }))
  })

  it('el paciente NO puede crear con days > 1 (arrancar arriba)', async () => {
    const db = asSocio()
    await assertFails(setDoc(doc(db, `clinics/${CLINIC}/attendanceMonthly/${entryId}`), { ...base, days: 5 }))
  })

  it('el paciente puede incrementar de a 1', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `clinics/${CLINIC}/attendanceMonthly/${entryId}`), { ...base, days: 3 })
    })
    const db = asSocio()
    await assertSucceeds(updateDoc(doc(db, `clinics/${CLINIC}/attendanceMonthly/${entryId}`), { ...base, days: 4 }))
  })

  it('el paciente NO puede saltar de a más de 1', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `clinics/${CLINIC}/attendanceMonthly/${entryId}`), { ...base, days: 3 })
    })
    const db = asSocio()
    await assertFails(updateDoc(doc(db, `clinics/${CLINIC}/attendanceMonthly/${entryId}`), { ...base, days: 10 }))
  })

  it('nadie puede superar el tope de 31 días', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `clinics/${CLINIC}/attendanceMonthly/${entryId}`), { ...base, days: 31 })
    })
    const db = asSocio()
    await assertFails(updateDoc(doc(db, `clinics/${CLINIC}/attendanceMonthly/${entryId}`), { ...base, days: 32 }))
  })

  it('el paciente NO puede escribir el contador de OTRO paciente', async () => {
    const db = asSocio()
    await assertFails(
      setDoc(doc(db, `clinics/${CLINIC}/attendanceMonthly/2026-08_otro`), {
        ...base,
        memberId: 'otro',
        memberUid: 'otro-uid',
        days: 1,
      }),
    )
  })

  it('cualquier paciente del clinic puede leer el ranking', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `clinics/${CLINIC}/attendanceMonthly/${entryId}`), { ...base, days: 5 })
    })
    const db = asSocio()
    await assertSucceeds(getDoc(doc(db, `clinics/${CLINIC}/attendanceMonthly/${entryId}`)))
  })
})

describe('clinicMemberships — no se puede auto-promover a admin', () => {
  it('el paciente NO puede escribir su membresía con role admin', async () => {
    const db = asSocio()
    await assertFails(
      setDoc(doc(db, `users/${SOCIO_UID}/clinicMemberships/${CLINIC}`), {
        memberId: SOCIO_MEMBER,
        role: 'admin', // el member doc dice 'user' → la rule rechaza
      }),
    )
  })

  it('el paciente SÍ puede escribir su membresía con el role real (user)', async () => {
    const db = asSocio()
    await assertSucceeds(
      setDoc(doc(db, `users/${SOCIO_UID}/clinicMemberships/${CLINIC}`), {
        memberId: SOCIO_MEMBER,
        role: 'user',
      }),
    )
  })
})

describe('members — un paciente no accede a datos de otro', () => {
  it('el paciente NO puede leer el member doc de otro (por id arbitrario)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `clinics/${CLINIC}/members/otro`), {
        uid: 'otro-uid',
        email: 'otro@clinicA.com',
        role: 'user',
        fullName: 'Otro',
        status: 'active',
      })
    })
    const db = asSocio()
    await assertFails(getDoc(doc(db, `clinics/${CLINIC}/members/otro`)))
  })

  it('el paciente NO puede crear pacientes (eso es de admin)', async () => {
    const db = asSocio()
    await assertFails(
      setDoc(doc(db, `clinics/${CLINIC}/members/nuevo`), {
        uid: '',
        email: 'nuevo@clinicA.com',
        role: 'user',
        fullName: 'Nuevo',
        status: 'active',
      }),
    )
  })

  it('el paciente SÍ puede editar sus propios datos (fullName)', async () => {
    const db = asSocio()
    await assertSucceeds(
      updateDoc(doc(db, `clinics/${CLINIC}/members/${SOCIO_MEMBER}`), { fullName: 'Rodrigo Actualizado' }),
    )
  })

  it('el paciente NO puede auto-cambiarse el role a admin vía self-edit', async () => {
    const db = asSocio()
    await assertFails(
      updateDoc(doc(db, `clinics/${CLINIC}/members/${SOCIO_MEMBER}`), { role: 'admin' }),
    )
  })
})

describe('aislamiento entre clinics', () => {
  it('el admin del clinic A NO puede escribir productos del clinic B', async () => {
    const db = asAdmin()
    await assertFails(
      setDoc(doc(db, `clinics/${OTHER_CLINIC}/products/p1`), {
        name: 'Proteína',
        description: 'x',
        photoURL: 'data:image/webp;base64,AAAA',
        price: 1000,
        discountPct: 0,
        available: true,
      }),
    )
  })

  it('el admin del clinic A NO puede tocar la subscription del clinic B', async () => {
    const db = asAdmin()
    await assertFails(
      updateDoc(doc(db, `clinics/${OTHER_CLINIC}`), {
        subscription: { planId: 'tier-premium', monthlyCost: 0, status: 'active' },
      }),
    )
  })
})

describe('products — validación de forma', () => {
  it('rechaza precio 0', async () => {
    const db = asAdmin()
    await assertFails(
      setDoc(doc(db, `clinics/${CLINIC}/products/p1`), {
        name: 'Gratis',
        description: 'x',
        photoURL: 'data:image/webp;base64,AAAA',
        price: 0,
        discountPct: 0,
        available: true,
      }),
    )
  })

  it('rechaza descuento > 100', async () => {
    const db = asAdmin()
    await assertFails(
      setDoc(doc(db, `clinics/${CLINIC}/products/p1`), {
        name: 'Producto',
        description: 'x',
        photoURL: 'data:image/webp;base64,AAAA',
        price: 1000,
        discountPct: 120,
        available: true,
      }),
    )
  })

  it('acepta un producto válido del admin', async () => {
    const db = asAdmin()
    await assertSucceeds(
      setDoc(doc(db, `clinics/${CLINIC}/products/p1`), {
        name: 'Proteína',
        description: 'Sabor vainilla',
        photoURL: 'data:image/webp;base64,AAAA',
        price: 45000,
        discountPct: 10,
        available: true,
      }),
    )
  })
})

describe('logs — el paciente solo escribe registros con forma válida', () => {
  const logPath = `clinics/${CLINIC}/members/${SOCIO_MEMBER}/logs/2026-08-15_r1_press`
  const validLog = {
    routineId: 'r1',
    exerciseKey: 'press',
    exerciseName: 'Press banca',
    dayKey: '2026-08-15',
    sets: [{ weight: 40, reps: 10 }],
  }

  it('el dueño puede crear un log válido', async () => {
    const db = asSocio()
    await assertSucceeds(setDoc(doc(db, logPath), validLog))
  })

  it('rechaza claves fuera del esquema (payload arbitrario)', async () => {
    const db = asSocio()
    await assertFails(setDoc(doc(db, logPath), { ...validLog, junk: 'x'.repeat(1000) }))
  })

  it('rechaza exerciseName gigante (DoS de doc)', async () => {
    const db = asSocio()
    await assertFails(setDoc(doc(db, logPath), { ...validLog, exerciseName: 'x'.repeat(500) }))
  })

  it('rechaza demasiados sets', async () => {
    const db = asSocio()
    const sets = Array.from({ length: 61 }, () => ({ weight: 1, reps: 1 }))
    await assertFails(setDoc(doc(db, logPath), { ...validLog, sets }))
  })

  it('un paciente ajeno NO puede escribir logs de otro', async () => {
    const db = asOutsider()
    await assertFails(setDoc(doc(db, logPath), validLog))
  })
})

describe('members — photoURL del self-edit está acotado', () => {
  it('el paciente puede setear una foto data URL válida', async () => {
    const db = asSocio()
    await assertSucceeds(
      updateDoc(doc(db, `clinics/${CLINIC}/members/${SOCIO_MEMBER}`), {
        photoURL: 'data:image/webp;base64,AAAA',
      }),
    )
  })

  it('el paciente NO puede setear un esquema peligroso en photoURL', async () => {
    const db = asSocio()
    await assertFails(
      updateDoc(doc(db, `clinics/${CLINIC}/members/${SOCIO_MEMBER}`), {
        photoURL: 'javascript:alert(1)',
      }),
    )
  })

  it('el paciente NO puede meter un payload gigante en photoURL', async () => {
    const db = asSocio()
    await assertFails(
      updateDoc(doc(db, `clinics/${CLINIC}/members/${SOCIO_MEMBER}`), {
        photoURL: 'data:image/png;base64,' + 'A'.repeat(200000),
      }),
    )
  })
})

// Sanity: el módulo importó bien (falla temprano si el emulador no está arriba).
it('el entorno de test se inicializó', () => {
  assert.ok(testEnv)
})

/**
 * memberLoginIndex: la ÚNICA colección del ruleset que se lee sin autenticar (el
 * login necesita resolver email → clinic ANTES de que exista una sesión). No tenía
 * ninguna cobertura, y el alta de pacientes ahora escribe el paciente y su índice en un
 * MISMO batch, así que estos tests fijan que ese batch pase las rules.
 */
describe('memberLoginIndex — índice de login world-readable', () => {
  const NEW_MEMBER = 'nuevo-member'
  const NEW_EMAIL = 'nuevo@clinica.com'
  const indexDoc = (email: string) => `memberLoginIndex/${email}`
  const validIndex = (email: string, clinicId = CLINIC, memberId = NEW_MEMBER) => ({
    email,
    clinicId,
    clinicName: 'Clinic A',
    memberId,
  })

  it('el admin puede crear el paciente y su índice en UN SOLO batch (alta atómica)', async () => {
    const db = asAdmin()
    const batch = writeBatch(db)
    batch.set(doc(db, `clinics/${CLINIC}/members/${NEW_MEMBER}`), {
      uid: '',
      email: NEW_EMAIL,
      loginEmail: NEW_EMAIL,
      role: 'user',
      fullName: 'Paciente Nuevo',
      authStatus: 'pending_password',
    })
    batch.set(doc(db, indexDoc(NEW_EMAIL)), validIndex(NEW_EMAIL))
    await assertSucceeds(batch.commit())
  })

  it('cualquiera puede LEER un índice sin autenticarse (lo necesita el login)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), indexDoc(NEW_EMAIL)), validIndex(NEW_EMAIL))
    })
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, indexDoc(NEW_EMAIL))))
  })

  it('un tercero NO puede escribir el índice de otro clinic', async () => {
    const db = asOutsider()
    await assertFails(setDoc(doc(db, indexDoc(NEW_EMAIL)), validIndex(NEW_EMAIL)))
  })

  it('el índice NO acepta claves de más (es world-readable: nada de PII extra)', async () => {
    const db = asAdmin()
    await assertFails(
      setDoc(doc(db, indexDoc(NEW_EMAIL)), {
        ...validIndex(NEW_EMAIL),
        fullName: 'Paciente Nuevo',
      }),
    )
  })

  it('la clave del doc DEBE ser el email del payload (anti-envenenamiento)', async () => {
    const db = asAdmin()
    await assertFails(
      setDoc(doc(db, indexDoc('otro@clinica.com')), validIndex(NEW_EMAIL)),
    )
  })

  it('el admin NO puede reapuntar un índice existente a su propio clinic', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), indexDoc(NEW_EMAIL)),
        validIndex(NEW_EMAIL, OTHER_CLINIC, 'member-de-clinicB'),
      )
    })
    const db = asAdmin()
    await assertFails(setDoc(doc(db, indexDoc(NEW_EMAIL)), validIndex(NEW_EMAIL)))
  })
})

/**
 * blockedEmails: la lista de vetos. Es la única colección que se hace cumplir
 * "desde afuera" — nadie la lee salvo el super-admin, pero las rules la consultan
 * con `isBlockedEmail()` para negar altas. Esos son los tests que importan: el
 * modo demo no ejecuta rules, así que sin esto el veto no está verificado en
 * ninguna parte.
 */
describe('blockedEmails — veto de acceso a la plataforma', () => {
  const VETADO = 'vetado@gmail.com'
  const LIMPIO = 'limpio@gmail.com'
  const blockedDoc = (email: string) => `blockedEmails/${email}`
  const validBlock = (email: string) => ({ email, createdAt: new Date() })

  async function seedBlocked(email: string) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), blockedDoc(email)), { email, createdAt: new Date() })
    })
  }

  it('solo el super-admin puede vetar', async () => {
    await assertSucceeds(
      setDoc(doc(asSuper(), blockedDoc(VETADO)), {
        email: VETADO,
        reason: 'spam',
        createdAt: new Date(),
      }),
    )
    await assertFails(setDoc(doc(asAdmin(), blockedDoc(LIMPIO)), validBlock(LIMPIO)))
    await assertFails(setDoc(doc(asOutsider(), blockedDoc(LIMPIO)), validBlock(LIMPIO)))
  })

  it('la lista NO es legible por nadie más que el super-admin', async () => {
    await seedBlocked(VETADO)
    await assertSucceeds(getDoc(doc(asSuper(), blockedDoc(VETADO))))
    // Que un admin de clinic no pueda leerla es lo que evita que se sepa quién está
    // vetado. El veto igual funciona: las rules leen con privilegios propios.
    await assertFails(getDoc(doc(asAdmin(), blockedDoc(VETADO))))
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), blockedDoc(VETADO))))
  })

  it('la clave del doc tiene que ser el email (si no, isBlockedEmail no lo encuentra)', async () => {
    await assertFails(setDoc(doc(asSuper(), blockedDoc('otro@gmail.com')), validBlock(VETADO)))
  })

  it('un admin NO puede dar de alta un paciente con un email vetado', async () => {
    await seedBlocked(VETADO)
    await assertFails(
      setDoc(doc(asAdmin(), `clinics/${CLINIC}/members/nuevo-vetado`), {
        uid: '',
        email: VETADO,
        loginEmail: VETADO,
        role: 'user',
        fullName: 'Vetado',
        authStatus: 'pending_password',
      }),
    )
  })

  it('el mismo alta SÍ funciona con un email no vetado', async () => {
    // Contraprueba: sin esto, el test de arriba pasaría igual si todo estuviera roto.
    await seedBlocked(VETADO)
    await assertSucceeds(
      setDoc(doc(asAdmin(), `clinics/${CLINIC}/members/nuevo-limpio`), {
        uid: '',
        email: LIMPIO,
        loginEmail: LIMPIO,
        role: 'user',
        fullName: 'Limpio',
        authStatus: 'pending_password',
      }),
    )
  })

  it('el índice de login de un email vetado no se puede (re)crear', async () => {
    // Cubre las tres vías por las que reaparecería solo: alta, backfill de la
    // lista de pacientes, y el updateMemberAuthStatus del propio paciente al entrar.
    await seedBlocked(VETADO)
    await assertFails(
      setDoc(doc(asAdmin(), `memberLoginIndex/${VETADO}`), {
        email: VETADO,
        clinicId: CLINIC,
        clinicName: 'Clinic A',
        memberId: 'algun-member',
      }),
    )
  })

  it('un vetado no puede reclamar su membresía por el camino del claim', async () => {
    // claimPendingMemberships usa un collectionGroup que NO pasa por el índice,
    // así que borrarle el índice no alcanza: hace falta el chequeo en el claim.
    await seedBlocked(VETADO)
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `clinics/${CLINIC}/members/sin-reclamar`), {
        uid: '',
        email: VETADO,
        loginEmail: VETADO,
        role: 'user',
        fullName: 'Vetado',
      })
    })
    const db = testEnv.authenticatedContext('vetado-uid', { email: VETADO }).firestore()
    await assertFails(
      updateDoc(doc(db, `clinics/${CLINIC}/members/sin-reclamar`), { uid: 'vetado-uid' }),
    )
  })

  it('levantar el veto vuelve a permitir el alta', async () => {
    await seedBlocked(VETADO)
    await assertSucceeds(deleteDoc(doc(asSuper(), blockedDoc(VETADO))))
    await assertSucceeds(
      setDoc(doc(asAdmin(), `clinics/${CLINIC}/members/ya-no-vetado`), {
        uid: '',
        email: VETADO,
        loginEmail: VETADO,
        role: 'user',
        fullName: 'Ya no vetado',
        authStatus: 'pending_password',
      }),
    )
  })
})
