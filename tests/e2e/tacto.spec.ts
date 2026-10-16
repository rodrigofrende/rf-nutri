import { expect, test, type Page } from '@playwright/test'

/**
 * El selector de apps de la landing en un celular, CON EL DEDO.
 *
 * Con mouse estos casos no se ven: en un iPhone el toque llega primero como
 * `pointerdown` y el `click` (y el `mousedown`) se sintetizan al soltar, y no
 * siempre. Cerrar con `mousedown` dejaba el panel abierto al tocar texto, y
 * reposicionarlo en cada scroll lo dejaba un frame atrás de la barra. Es lo que
 * en RF FIT se sentía como un waffle que "a veces anda y a veces no" (oct 2026).
 *
 * Arriba de todo se ve el waffle de la barra del hero; el de la barra sticky
 * está en el DOM pero escondido hasta scrollear. Por eso `.last()`.
 */
test.describe('el selector de apps con el dedo', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

  const waffle = (page: Page) => page.getByRole('button', { name: 'Apps del estudio RF' }).last()
  const panel = (page: Page) => page.getByRole('menu')

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('abre y cierra con toques seguidos sobre el waffle', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await waffle(page).tap()
      await expect(panel(page)).toBeVisible()
      await waffle(page).tap()
      await expect(panel(page)).toBeHidden()
    }
  })

  test('tocar afuera, sobre texto, lo cierra', async ({ page }) => {
    await waffle(page).tap()
    await expect(panel(page)).toBeVisible()

    // Un punto sobre TEXTO, no sobre un control, que es justo donde iOS puede
    // no mandar el `mousedown`. Se busca en la pantalla en vez de fijarlo: el
    // panel mide 280px y en 390px tapa casi todo el ancho de arriba.
    const punto = await page.evaluate(() => {
      const menu = document.querySelector('[role="menu"]')!.getBoundingClientRect()
      for (let y = window.innerHeight - 40; y > 80; y -= 30) {
        for (let x = 20; x < window.innerWidth - 20; x += 30) {
          if (x >= menu.left && x <= menu.right && y >= menu.top && y <= menu.bottom) continue
          const el = document.elementFromPoint(x, y)
          if (el && !el.closest('a, button, summary, label, input, [role="menu"]')) return [x, y]
        }
      }
      return null
    })
    expect(punto, 'no hay texto suelto a la vista para tocar').toBeTruthy()
    await page.touchscreen.tap(punto![0], punto![1])
    await expect(panel(page)).toBeHidden()
  })

  test('scrollear lo cierra en vez de perseguir la barra', async ({ page }) => {
    await waffle(page).tap()
    await expect(panel(page)).toBeVisible()
    // El listener de scroll se pone un instante después de abrir (ver
    // AppSwitcher): antes de eso un scroll no es de la persona.
    await page.waitForTimeout(100)

    await page.evaluate(() => window.scrollBy(0, 400))
    await expect(panel(page)).toBeHidden()
  })
})
