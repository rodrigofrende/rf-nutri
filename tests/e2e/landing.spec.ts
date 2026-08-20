import { expect, test } from '@playwright/test'
import { gotoSpa, logout } from './helpers'

/**
 * La landing solo se ve deslogueado. En demo la app arranca como admin y
 * cualquier recarga resetea a admin, así que: se cierra sesión (client-side →
 * /login) y se navega a `/` por History API (sin recargar) para que
 * HomeRedirect, sin usuario, renderice la landing.
 */
test.describe('Landing pública', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await logout(page)
    await gotoSpa(page, '/')
    await expect(page.getByRole('heading', { name: 'Poné tu consultorio en forma.' })).toBeVisible()
  })

  test('muestra el hero y el botón de ingreso', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Ingresar' }).first()).toBeVisible()
    await expect(page.getByText('Software de gestión para consultorios').first()).toBeVisible()
  })

  test('el CTA principal contacta por email con el asunto puesto, no por WhatsApp', async ({
    page,
  }) => {
    // Un mailto directo: es el propio selector de apps del sistema, así que no hay
    // menú intermedio que abrir (antes había uno con 3 opciones).
    const cta = page.getByRole('link', { name: /Quiero RF FIT en mi consultorio/ }).first()
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href).toContain('mailto:hola@rf-platform.com')
    // El asunto pre-armado es lo que hace que el mail llegue ya clasificado.
    expect(href).toContain(`subject=${encodeURIComponent('Quiero RF FIT en mi consultorio')}`)
    // Ya no debe quedar ningún link a WhatsApp en la landing.
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0)
  })

  test('el CTA de un plan lleva el asunto de ESE plan', async ({ page }) => {
    // Lo que distingue este contacto del genérico: el asunto dice qué plan miró.
    const planCta = page.locator('a[href^="mailto:"][href*="plan"]').first()
    await expect(planCta).toBeVisible()
    expect(await planCta.getAttribute('href')).toContain(encodeURIComponent('plan'))
  })

  test('lista los 3 planes con "A medida" y "Recomendado"', async ({ page }) => {
    await expect(page.getByText('Entrada en Calor', { exact: true })).toBeVisible()
    await expect(page.getByText('Ritmo', { exact: true })).toBeVisible()
    await expect(page.getByText('Alto Rendimiento', { exact: true })).toBeVisible()
    await expect(page.getByText('A medida').first()).toBeVisible()
    await expect(page.getByText('Recomendado')).toBeVisible()
  })

  test('muestra la sección de clientes con TigerFit', async ({ page }) => {
    await expect(page.getByText('TigerFit', { exact: false }).first()).toBeVisible()
  })
})
