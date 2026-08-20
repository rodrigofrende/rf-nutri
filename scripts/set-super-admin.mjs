#!/usr/bin/env node
/**
 * Otorga (o revoca) la capacidad de super-admin de la plataforma seteando el
 * custom claim `superAdmin` en el token de un usuario de Firebase Auth.
 *
 * Es la ÚNICA forma de crear un super-admin: ya no hay email hardcodeado en las
 * reglas ni en el cliente. Las `firestore.rules` confían en
 * `request.auth.token.superAdmin == true`.
 *
 * Requisitos:
 *   - Node >= 20 y `firebase-admin` instalado (dev dependency del repo).
 *   - Credenciales de Admin SDK. Usá una de estas:
 *       export GOOGLE_APPLICATION_CREDENTIALS=/ruta/serviceAccount.json
 *     o bien pasá la ruta con --key=/ruta/serviceAccount.json
 *     (Descargá el service account en la consola de Firebase:
 *      Project settings → Service accounts → Generate new private key.)
 *
 * Uso:
 *   node scripts/set-super-admin.mjs <email|uid>
 *   node scripts/set-super-admin.mjs <email|uid> --revoke
 *   node scripts/set-super-admin.mjs <email|uid> --key=/ruta/serviceAccount.json
 *
 * Importante: tras setear el claim, el usuario debe refrescar su token para que
 * tome efecto (re-login, o `getIdToken(true)` en el cliente).
 */
import { readFileSync } from 'node:fs'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')))
const keyArg = args.find((a) => a.startsWith('--key='))?.split('=')[1]
const target = args.find((a) => !a.startsWith('--'))

if (!target) {
  console.error('Falta el email o uid del usuario.\n')
  console.error('Uso: node scripts/set-super-admin.mjs <email|uid> [--revoke] [--key=/ruta/serviceAccount.json]')
  process.exit(1)
}

const revoke = flags.has('--revoke')
const keyPath = keyArg ?? process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!keyPath && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('No hay credenciales de Admin SDK.')
  console.error('Seteá GOOGLE_APPLICATION_CREDENTIALS o pasá --key=/ruta/serviceAccount.json')
  process.exit(1)
}

const credential = keyPath
  ? cert(JSON.parse(readFileSync(keyPath, 'utf8')))
  : applicationDefault()

initializeApp({ credential })
const auth = getAuth()

async function main() {
  const user = target.includes('@')
    ? await auth.getUserByEmail(target)
    : await auth.getUser(target)

  // Preservamos otros claims que pudiera tener el usuario.
  const claims = { ...(user.customClaims ?? {}) }
  if (revoke) delete claims.superAdmin
  else claims.superAdmin = true

  await auth.setCustomUserClaims(user.uid, claims)

  console.log(`${revoke ? 'Revocado' : 'Otorgado'} superAdmin a ${user.email ?? user.uid} (uid: ${user.uid})`)
  console.log('El usuario debe refrescar su token (re-login o getIdToken(true)) para que tome efecto.')
}

main().catch((err) => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
