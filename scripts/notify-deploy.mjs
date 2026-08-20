// Aviso de deploy a ntfy (topic personal del dueño): corre al final del build
// de Netlify (ver netlify.toml). Fuera de Netlify o en deploy previews no hace
// nada, y un fallo del aviso nunca rompe el deploy.
import { readFileSync } from 'node:fs'

// Misma variable que consume el cliente (src/config/env.ts): una sola fuente de
// verdad para el topic, rotable desde el panel de Netlify sin tocar código.
// OJO: NO es un secreto — Vite la inlinea en el bundle público.
const TOPIC = process.env.VITE_NTFY_TOPIC?.trim()

if (!TOPIC) {
  console.log('[notify-deploy] falta VITE_NTFY_TOPIC: no se notifica')
  process.exit(0)
}
if (process.env.NETLIFY !== 'true') {
  console.log('[notify-deploy] fuera de Netlify: no se notifica')
  process.exit(0)
}
if (process.env.CONTEXT && process.env.CONTEXT !== 'production') {
  console.log(`[notify-deploy] contexto "${process.env.CONTEXT}": no se notifica`)
  process.exit(0)
}

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const commit = (process.env.COMMIT_REF ?? '').slice(0, 7)

try {
  await fetch(`https://ntfy.sh/${TOPIC}`, {
    method: 'POST',
    headers: { Title: `RF NUTRI deploy v${version}`, Tags: 'rocket' },
    body: `Build OK${commit ? ` (${commit})` : ''} — publicando en fit.rf-platform.com`,
  })
  console.log('[notify-deploy] aviso enviado')
} catch (err) {
  console.warn('[notify-deploy] no se pudo notificar:', err?.message ?? err)
}
