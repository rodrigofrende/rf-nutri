import { expect, type Page } from '@playwright/test'

/**
 * Manejo del demo mode. La app arranca YA logueada como admin Ian
 * (AuthProvider hardcodea identity='admin'); la identidad vive solo en React
 * state, así que **un page.goto() recarga y la resetea a admin**. Por eso toda
 * la navegación post-login es CLIENT-SIDE (clicks / History API), nunca goto.
 */
export type DemoRole = 'admin' | 'paciente' | 'superadmin'

const LOGIN_BUTTON: Record<DemoRole, string> = {
  admin: 'Entrar como Admin',
  paciente: 'Entrar como Paciente',
  superadmin: 'Entrar al management (Super admin)',
}

const HOME: Record<DemoRole, RegExp> = {
  admin: /\/admin\/members/,
  paciente: /\/app\/routines/,
  superadmin: /\/super\/clinics/,
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).first().click()
  await expect(page).toHaveURL(/\/login/)
}

/**
 * Deja la sesión en el rol pedido. Tras el logout la app navega client-side a
 * /login (sin recargar), así que los botones demo siguen disponibles y la
 * identidad no se pierde.
 */
export async function loginAs(page: Page, who: DemoRole) {
  await page.goto('/') // arranca como admin → /admin/members
  await expect(page).toHaveURL(HOME.admin)
  if (who !== 'admin') {
    await logout(page)
    await page.getByRole('button', { name: LOGIN_BUTTON[who] }).click()
    await expect(page).toHaveURL(HOME[who])
  }
}

/** Navegación SPA sin recargar (evita el reset de identidad del demo). */
export async function gotoSpa(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

/** h1 del AppLayout aparece 2 veces (mobile + desktop) → siempre .first(). */
export function pageTitle(page: Page, name: string) {
  return page.getByRole('heading', { name, level: 1 }).first()
}
