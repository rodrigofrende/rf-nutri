import { expect, test } from '@playwright/test'
import { loginAs, pageTitle } from './helpers'

test.describe('Login por rol (demo)', () => {
  test('admin entra a Pacientes', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(pageTitle(page, 'Pacientes')).toBeVisible()
  })

  test('super-admin entra a Consultorios', async ({ page }) => {
    await loginAs(page, 'superadmin')
    await expect(pageTitle(page, 'Consultorios')).toBeVisible()
  })

  test('paciente entra a sus rutinas (al día, sin bloqueo)', async ({ page }) => {
    await loginAs(page, 'paciente')
    await expect(pageTitle(page, 'Mis rutinas')).toBeVisible()
  })
})

test.describe('Seguridad de navegación', () => {
  test('el paciente no ve las secciones de admin en su menú', async ({ page }) => {
    await loginAs(page, 'paciente')
    // El nav del paciente (USER_NAV) no incluye rutas de gestión.
    await expect(page.getByRole('link', { name: 'Pacientes' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Tarifas' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Marca' })).toHaveCount(0)
    // Sí ve las suyas.
    await expect(page.getByRole('link', { name: 'Tienda' })).toBeVisible()
  })
})
