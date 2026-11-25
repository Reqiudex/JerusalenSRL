// Crea la aplicación Express (separada de servidor.js para poder probarla).
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import cookieParser from 'cookie-parser'
import { cargarUsuario, montarAuth } from './auth.js'
import { RAIZ_REPO, config, hoy } from './config.js'
import { rutasBase } from './rutas/base.js'
import { rutasComercial } from './rutas/comercial.js'
import { rutasInventario } from './rutas/inventario.js'
import { rutasGestion } from './rutas/gestion.js'
import { rutasReportes } from './rutas/reportes.js'
import { ErrorHttp } from './util.js'

export function crearApp(db, { estaticos = config.servirEstaticos } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', ['loopback', 'uniquelocal']) // túnel en el host + red de Docker
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())

  // Cabeceras de seguridad básicas
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'same-origin')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store')
    next()
  })

  // Protección CSRF simple: las escrituras deben venir como JSON (los formularios de otros sitios no pueden mandar JSON con cookies)
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !req.is('application/json') && req.headers['content-length'] !== '0') {
      return res.status(415).json({ error: 'Envía los datos como JSON.' })
    }
    next()
  })

  app.use(cargarUsuario(db))
  app.get('/api/salud', (_req, res) => res.json({ ok: true, hoy: hoy() }))
  montarAuth(app, db)
  app.use('/api', rutasBase(db))
  app.use('/api', rutasComercial(db))
  app.use('/api', rutasInventario(db))
  app.use('/api', rutasGestion(db))
  app.use('/api', rutasReportes(db))
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta de la API no encontrada.' }))

  // Archivos compilados: adminj.* → panel del dueño; el resto → ERP. También /dueno/ en cualquier dominio.
  if (estaticos) {
    const distErp = path.join(RAIZ_REPO, 'apps', 'erp', 'dist')
    const distDueno = path.join(RAIZ_REPO, 'apps', 'dueno', 'dist')
    const servir = (dir) => {
      const estatico = express.static(dir, { index: false, maxAge: '7d', setHeaders: (res, ruta) => ruta.endsWith('.html') && res.setHeader('Cache-Control', 'no-cache') })
      return [estatico, (req, res, next) => (req.method === 'GET' && fs.existsSync(path.join(dir, 'index.html')) ? res.sendFile(path.join(dir, 'index.html'), { headers: { 'Cache-Control': 'no-cache' } }) : next())]
    }
    const [estDueno, indiceDueno] = servir(distDueno)
    const [estErp, indiceErp] = servir(distErp)
    app.use('/dueno', estDueno, indiceDueno)
    app.use((req, res, next) => (String(req.hostname).startsWith('adminj') ? estDueno(req, res, () => indiceDueno(req, res, next)) : next()))
    app.use(estErp, indiceErp)
  }

  // Errores
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err instanceof ErrorHttp) return res.status(err.estado).json({ error: err.message, ...err.extra })
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON enviado no es válido.' })
    if (String(err?.code ?? '').startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'El dato entra en conflicto con otro registro (duplicado o en uso).' })
    console.error(err)
    res.status(500).json({ error: 'Ocurrió un error inesperado. Intenta de nuevo.' })
  })
  return app
}
