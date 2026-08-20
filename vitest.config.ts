import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

/**
 * Dos suites, que se corren por separado:
 *  - tests/unit: puro Node, sin dependencias externas (`pnpm test:unit`).
 *  - tests/rules: reglas de Firestore contra el emulador, necesita Java +
 *    `firebase emulators:exec` (`pnpm test:rules`).
 * Los e2e los corre Playwright aparte (tests/e2e), no Vitest.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15_000,
  },
})
