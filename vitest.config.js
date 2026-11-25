import path from 'node:path'
import { defineConfig } from 'vitest/config'

const raiz = import.meta.dirname
export default defineConfig({
  resolve: {
    alias: {
      '@ui': path.join(raiz, 'packages/ui/src'),
      '@reportes': path.join(raiz, 'packages/reportes/src'),
      '@matriz': path.join(raiz, 'packages/matriz-corte/src'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.js', 'packages/*/src/**/*.test.js', 'apps/*/test/**/*.test.js', 'apps/*/src/**/*.test.js'],
    environment: 'node',
    testTimeout: 20000,
  },
})
