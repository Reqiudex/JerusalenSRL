import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ERP (erpj.cerice360.com). En desarrollo, /api va a la API local (puerto 3100).
const raiz = path.resolve(import.meta.dirname, '../..')
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@ui': path.join(raiz, 'packages/ui/src'),
      '@reportes': path.join(raiz, 'packages/reportes/src'),
      '@matriz': path.join(raiz, 'packages/matriz-corte/src'),
    },
  },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3100' } },
  build: { target: 'es2020', chunkSizeWarningLimit: 500 },
})
