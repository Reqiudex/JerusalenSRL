import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Panel del dueño (adminj.cerice360.com). base './' para servirlo en / o en /dueno/.
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: { alias: { '@ui': path.resolve(import.meta.dirname, '../../packages/ui/src') } },
  server: { port: 5174, proxy: { '/api': 'http://localhost:3100' } },
  build: { target: 'es2020', chunkSizeWarningLimit: 300 },
})
