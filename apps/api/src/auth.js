// Autenticación: sesiones con cookie httpOnly, clave (bcrypt) y PIN del dueño.
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { ROLES, permisosDeRol, puede } from './permisos.js'
import { ErrorHttp, manejar, registrar, validar } from './util.js'

export const COOKIE = 'jerusalen_sesion'

// Límite de intentos fallidos por IP (en memoria): 5 fallos → 5 minutos de espera.
const intentos = new Map()
const MAX_FALLOS = 5
const BLOQUEO_MS = 5 * 60 * 1000

function comprobarBloqueo(clave) {
  const r = intentos.get(clave)
  if (r && r.hasta > Date.now()) {
    const min = Math.ceil((r.hasta - Date.now()) / 60000)
    throw new ErrorHttp(429, `Demasiados intentos. Espera ${min} minuto${min === 1 ? '' : 's'}.`)
  }
}
function fallo(clave) {
  const r = intentos.get(clave) ?? { n: 0, hasta: 0 }
  r.n += 1
  if (r.n >= MAX_FALLOS) {
    r.hasta = Date.now() + BLOQUEO_MS
    r.n = 0
  }
  intentos.set(clave, r)
}
export function reiniciarIntentos() {
  intentos.clear()
}

export function usuarioPublico(u) {
  if (!u) return null
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    rolNombre: ROLES[u.rol],
    sucursal_id: u.sucursal_id,
    sucursal: u.sucursal ?? null,
    telefono: u.telefono,
    permisos: permisosDeRol(u.rol),
  }
}

function crearSesion(db, res, usuario, tipo) {
  const token = crypto.randomBytes(32).toString('hex')
  const horas = tipo === 'pin' ? 24 * 30 : config.diasSesion * 24
  const expira = new Date(Date.now() + horas * 3600 * 1000).toISOString()
  db.prepare('INSERT INTO sesiones (token, usuario_id, tipo, expira_en) VALUES (?, ?, ?, ?)').run(token, usuario.id, tipo, expira)
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.cookieSegura, maxAge: horas * 3600 * 1000, path: '/' })
}

export function cargarUsuario(db) {
  const consulta = db.prepare(`
    SELECT u.*, s.tipo AS tipo_sesion, su.nombre AS sucursal
    FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id LEFT JOIN sucursales su ON su.id = u.sucursal_id
    WHERE s.token = ? AND s.expira_en > ? AND u.activo = 1`)
  return (req, _res, next) => {
    const token = req.cookies?.[COOKIE]
    req.usuario = token ? consulta.get(token, new Date().toISOString()) ?? null : null
    next()
  }
}

/** Exige sesión y permiso sobre un módulo. accion: 'leer' | 'escribir'. */
export function exigir(modulo, accion = 'leer') {
  return (req, _res, next) => {
    if (!req.usuario) return next(new ErrorHttp(401, 'Inicia sesión para continuar.'))
    // La sesión por PIN solo sirve para el panel del dueño
    if (req.usuario.tipo_sesion === 'pin' && modulo !== 'dueno') return next(new ErrorHttp(403, 'Con el PIN solo se puede ver el panel del dueño.'))
    if (modulo && !puede(req.usuario.rol, modulo, accion)) return next(new ErrorHttp(403, 'No tienes permiso para esto.'))
    next()
  }
}

/** Para vendedores: solo ven lo suyo. Devuelve el id a filtrar o null (ve todo). */
export function filtroVendedor(req) {
  return req.usuario?.rol === 'vendedor' ? req.usuario.id : null
}

export function montarAuth(app, db) {
  app.post('/api/auth/ingresar', manejar((req, res) => {
    const ip = req.ip ?? 'local'
    comprobarBloqueo(`clave|${ip}`)
    const { email, clave } = validar(req.body, { email: { tipo: 'texto', requerido: true }, clave: { tipo: 'texto', requerido: true } })
    const u = db.prepare('SELECT u.*, su.nombre AS sucursal FROM usuarios u LEFT JOIN sucursales su ON su.id = u.sucursal_id WHERE u.email = ?').get(email)
    if (!u || !u.password_hash || !bcrypt.compareSync(clave, u.password_hash)) {
      fallo(`clave|${ip}`)
      throw new ErrorHttp(401, 'Correo o contraseña incorrectos.')
    }
    if (!u.activo) throw new ErrorHttp(403, 'Este usuario está desactivado.')
    if (u.rol === 'dueno') throw new ErrorHttp(403, 'El dueño ingresa con su PIN en el panel del dueño.')
    intentos.delete(`clave|${ip}`)
    crearSesion(db, res, u, 'clave')
    registrar(db, u.id, 'ingreso')
    res.json({ usuario: usuarioPublico(u) })
  }))

  // PIN de 4 a 6 dígitos, solo para el panel del dueño (rol dueño o administrador con PIN)
  app.post('/api/auth/pin', manejar((req, res) => {
    const ip = req.ip ?? 'local'
    comprobarBloqueo(`pin|${ip}`)
    const pin = String(req.body?.pin ?? '')
    if (!/^\d{4,6}$/.test(pin)) throw new ErrorHttp(422, 'El PIN tiene de 4 a 6 números.')
    const candidatos = db.prepare("SELECT * FROM usuarios WHERE activo = 1 AND pin_hash IS NOT NULL AND rol IN ('dueno','administrador')").all()
    const u = candidatos.find((c) => bcrypt.compareSync(pin, c.pin_hash))
    if (!u) {
      fallo(`pin|${ip}`)
      throw new ErrorHttp(401, 'PIN incorrecto.')
    }
    intentos.delete(`pin|${ip}`)
    crearSesion(db, res, u, 'pin')
    res.json({ usuario: usuarioPublico(u) })
  }))

  app.get('/api/auth/yo', (req, res) => {
    if (!req.usuario) return res.status(401).json({ error: 'No has iniciado sesión.' })
    res.json({ usuario: usuarioPublico(req.usuario), tipoSesion: req.usuario.tipo_sesion })
  })

  app.post('/api/auth/salir', (req, res) => {
    const token = req.cookies?.[COOKIE]
    if (token) db.prepare('DELETE FROM sesiones WHERE token = ?').run(token)
    res.clearCookie(COOKIE, { path: '/' })
    res.json({ ok: true })
  })

  app.post('/api/auth/clave', manejar((req, res) => {
    if (!req.usuario || req.usuario.tipo_sesion !== 'clave') throw new ErrorHttp(401, 'Inicia sesión para continuar.')
    const { actual, nueva } = validar(req.body, { actual: { tipo: 'texto', requerido: true }, nueva: { tipo: 'texto', requerido: true } })
    if (nueva.length < 8) throw new ErrorHttp(422, 'La nueva contraseña debe tener al menos 8 caracteres.')
    const u = db.prepare('SELECT password_hash FROM usuarios WHERE id = ?').get(req.usuario.id)
    if (!bcrypt.compareSync(actual, u.password_hash)) throw new ErrorHttp(422, 'La contraseña actual no es correcta.')
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(nueva, 10), req.usuario.id)
    // Cierra las demás sesiones
    db.prepare('DELETE FROM sesiones WHERE usuario_id = ? AND token <> ?').run(req.usuario.id, req.cookies[COOKIE])
    registrar(db, req.usuario.id, 'cambio de clave')
    res.json({ ok: true })
  }))

  // Limpieza periódica de sesiones vencidas
  const limpiar = () => db.prepare('DELETE FROM sesiones WHERE expira_en < ?').run(new Date().toISOString())
  limpiar()
  setInterval(limpiar, 6 * 3600 * 1000).unref()
}

export const hashClave = (clave) => bcrypt.hashSync(clave, 10)
