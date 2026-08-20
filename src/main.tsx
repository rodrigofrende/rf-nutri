import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initErrorReporting, reportCrash } from './utils/errorReporting'
import { initStaleDeployRecovery } from './utils/staleDeploy'

initErrorReporting()
// Antes de createRoot: el listener tiene que estar puesto desde el primer import
// dinámico, que puede dispararse en el primer render.
initStaleDeployRecovery()

createRoot(document.getElementById('root')!, {
  // React 19: reemplaza el logging por defecto de los errores que NINGÚN
  // ErrorBoundary atrapó (por ejemplo, un throw pintando el fallback del
  // boundary). Da el componentStack, que con el bundle minificado y sin
  // sourcemaps es lo único que dice qué pantalla explotó.
  //
  // OJO: el default de React hacía `reportError(error)`, que es lo que dispara
  // window.onerror y hace que el reporter los vea. Al pisar el hook ESE camino
  // desaparece, así que hay que avisar explícitamente acá o se pierden en
  // silencio.
  onUncaughtError: (error, info) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[uncaught]', error)
    reportCrash('react-uncaught', message, info.componentStack ?? undefined)
  },
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
