// Sucursales, usuarios, clientes y ajustes.
import { Router } from 'express'
import { PLANILLA_POR_DEFECTO, saldoVenta } from '@jerusalen/reportes'
import { exigir, hashClave } from '../auth.js'
import { guardarAjuste, leerAjuste } from '../db.js'
import { ROLES } from '../permisos.js'
import { ErrorHttp, invalido, manejar, noEncontrado, registrar, validar } from '../util.js'

export const AJUSTES_POR_DEFECTO = {
  empresa: {
    nombre: 'Jerusalén S.R.L.',
    lema: 'Mármol · Granito · Cuarzo · Piedra sinterizada',
    nit: '',
    telefono: '',
    whatsapp: '',
    direccion: 'Santa Cruz de la Sierra, Bolivia',
    email: '',
  },
  proformas: {
    validez_dias: 15,
    condiciones: 'Precios en bolivianos. Anticipo del 50 % para iniciar el trabajo. Medidas finales se confirman en obra. Plazo de entrega a coordinar.',
  },
  planilla: PLANILLA_POR_DEFECTO,
}

export function rutasBase(db) {
  const r = Router()

  // ── Sucursales ──
  const reglasSucursal = {
    nombre: { tipo: 'texto', requerido: true, largo: 80 },
    tipo: { tipo: 'texto', opciones: ['showroom', 'fabrica', 'mixta'], defecto: 'mixta' },
    direccion: { tipo: 'texto', largo: 200, defecto: '' },
    ciudad: { tipo: 'texto', largo: 80, defecto: 'Santa Cruz de la Sierra' },
    telefono: { tipo: 'texto', largo: 40, defecto: '' },
    activo: { tipo: 'bool', defecto: 1 },
  }
  r.get('/sucursales', exigir(null), manejar((req, res) => {
    const filas = db.prepare(`SELECT s.*, (SELECT COUNT(*) FROM trabajadores t WHERE t.sucursal_id = s.id AND t.activo = 1) AS trabajadores
                              FROM sucursales s ORDER BY s.id`).all()
    res.json(filas)
  }))
  r.post('/sucursales', exigir('sucursales', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, reglasSucursal)
    const info = db.prepare('INSERT INTO sucursales (nombre, tipo, direccion, ciudad, telefono, activo) VALUES (@nombre,@tipo,@direccion,@ciudad,@telefono,@activo)').run(d)
    registrar(db, req.usuario.id, 'sucursal creada', d.nombre)
    res.status(201).json(db.prepare('SELECT * FROM sucursales WHERE id = ?').get(info.lastInsertRowid))
  }))
  r.put('/sucursales/:id', exigir('sucursales', 'escribir'), manejar((req, res) => {
    const actual = db.prepare('SELECT * FROM sucursales WHERE id = ?').get(req.params.id)
    if (!actual) throw noEncontrado('Sucursal')
    const d = { ...actual, ...validar(req.body, reglasSucursal, { parcial: true }) }
    db.prepare('UPDATE sucursales SET nombre=@nombre, tipo=@tipo, direccion=@direccion, ciudad=@ciudad, telefono=@telefono, activo=@activo WHERE id=@id').run(d)
    res.json(db.prepare('SELECT * FROM sucursales WHERE id = ?').get(req.params.id))
  }))

  // ── Usuarios ──
  const columnasUsuario = 'u.id, u.nombre, u.email, u.rol, u.sucursal_id, u.telefono, u.activo, u.creado_en, s.nombre AS sucursal, (u.pin_hash IS NOT NULL) AS tiene_pin'
  r.get('/usuarios', exigir('usuarios'), manejar((req, res) => {
    res.json(db.prepare(`SELECT ${columnasUsuario} FROM usuarios u LEFT JOIN sucursales s ON s.id = u.sucursal_id ORDER BY u.activo DESC, u.nombre`).all())
  }))
  // Lista corta para filtros (vendedores, cortadores)
  r.get('/personas', exigir(null), manejar((req, res) => {
    const rol = req.query.rol
    const filas = db.prepare(`SELECT u.id, u.nombre, u.rol, u.sucursal_id FROM usuarios u WHERE u.activo = 1 ${rol ? 'AND u.rol = ?' : ''} ORDER BY u.nombre`).all(...(rol ? [rol] : []))
    res.json(filas)
  }))
  const reglasUsuario = {
    nombre: { tipo: 'texto', requerido: true, largo: 80 },
    email: { tipo: 'texto', requerido: true, largo: 120, nombre: 'correo' },
    rol: { tipo: 'texto', requerido: true, opciones: Object.keys(ROLES) },
    sucursal_id: { tipo: 'entero' },
    telefono: { tipo: 'texto', largo: 40, defecto: '' },
    activo: { tipo: 'bool', defecto: 1 },
    clave: { tipo: 'texto', largo: 200 },
    pin: { tipo: 'texto', largo: 6 },
  }
  const validarClavePin = (d) => {
    if (d.clave && d.clave.length < 8) throw invalido('La contraseña debe tener al menos 8 caracteres.')
    if (d.pin && !/^\d{4,6}$/.test(d.pin)) throw invalido('El PIN debe tener de 4 a 6 números.')
    if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) throw invalido('El correo no es válido.')
  }
  r.post('/usuarios', exigir('usuarios', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, reglasUsuario)
    validarClavePin(d)
    if (!d.clave && d.rol !== 'dueno') throw invalido('Indica una contraseña inicial.')
    if (d.rol === 'dueno' && !d.pin) throw invalido('El dueño necesita un PIN.')
    if (db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(d.email)) throw invalido('Ya existe un usuario con ese correo.')
    const info = db
      .prepare('INSERT INTO usuarios (nombre, email, rol, sucursal_id, telefono, activo, password_hash, pin_hash) VALUES (?,?,?,?,?,?,?,?)')
      .run(d.nombre, d.email, d.rol, d.sucursal_id ?? null, d.telefono, d.activo, d.clave ? hashClave(d.clave) : null, d.pin ? hashClave(d.pin) : null)
    registrar(db, req.usuario.id, 'usuario creado', d.email)
    res.status(201).json(db.prepare(`SELECT ${columnasUsuario} FROM usuarios u LEFT JOIN sucursales s ON s.id = u.sucursal_id WHERE u.id = ?`).get(info.lastInsertRowid))
  }))
  r.put('/usuarios/:id', exigir('usuarios', 'escribir'), manejar((req, res) => {
    const actual = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id)
    if (!actual) throw noEncontrado('Usuario')
    const d = validar(req.body, reglasUsuario, { parcial: true })
    validarClavePin(d)
    if (Number(req.params.id) === req.usuario.id && (d.activo === 0 || (d.rol && d.rol !== 'administrador'))) {
      throw invalido('No puedes quitarte a ti mismo el rol de administrador ni desactivarte.')
    }
    if (d.email && d.email.toLowerCase() !== actual.email.toLowerCase() && db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(d.email)) throw invalido('Ya existe un usuario con ese correo.')
    const n = { ...actual, ...d }
    db.prepare('UPDATE usuarios SET nombre=?, email=?, rol=?, sucursal_id=?, telefono=?, activo=? WHERE id=?').run(n.nombre, n.email, n.rol, n.sucursal_id ?? null, n.telefono, n.activo, actual.id)
    if (d.clave) db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hashClave(d.clave), actual.id)
    if (d.pin) db.prepare('UPDATE usuarios SET pin_hash = ? WHERE id = ?').run(hashClave(d.pin), actual.id)
    if (d.clave || d.pin || n.activo === 0) db.prepare('DELETE FROM sesiones WHERE usuario_id = ?').run(actual.id)
    registrar(db, req.usuario.id, 'usuario editado', n.email)
    res.json(db.prepare(`SELECT ${columnasUsuario} FROM usuarios u LEFT JOIN sucursales s ON s.id = u.sucursal_id WHERE u.id = ?`).get(actual.id))
  }))

  // ── Clientes ──
  const reglasCliente = {
    nombre: { tipo: 'texto', requerido: true, largo: 120 },
    telefono: { tipo: 'texto', largo: 40, defecto: '' },
    nit: { tipo: 'texto', largo: 30, defecto: '' },
    direccion: { tipo: 'texto', largo: 200, defecto: '' },
    ciudad: { tipo: 'texto', largo: 80, defecto: 'Santa Cruz de la Sierra' },
    notas: { tipo: 'texto', largo: 1000, defecto: '' },
  }
  r.get('/clientes', exigir('clientes'), manejar((req, res) => {
    const q = `%${String(req.query.q ?? '').trim()}%`
    const filas = db
      .prepare(`SELECT c.*,
          (SELECT COUNT(*) FROM ventas v WHERE v.cliente_id = c.id AND v.estado = 'vigente') AS ventas,
          (SELECT COALESCE(SUM(v.total),0) FROM ventas v WHERE v.cliente_id = c.id AND v.estado = 'vigente') AS comprado,
          (SELECT COALESCE(SUM(v.total),0) - COALESCE((SELECT SUM(p.monto) FROM pagos p JOIN ventas v2 ON v2.id = p.venta_id WHERE v2.cliente_id = c.id AND v2.estado='vigente'),0)
             FROM ventas v WHERE v.cliente_id = c.id AND v.estado = 'vigente') AS saldo
        FROM clientes c WHERE c.nombre LIKE ? OR c.telefono LIKE ? OR c.nit LIKE ?
        ORDER BY c.nombre LIMIT ?`)
      .all(q, q, q, Math.min(500, Number(req.query.limite) || 200))
    res.json(filas)
  }))
  r.get('/clientes/:id', exigir('clientes'), manejar((req, res) => {
    const c = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id)
    if (!c) throw noEncontrado('Cliente')
    const proformas = db.prepare('SELECT id, codigo, fecha, estado, total FROM proformas WHERE cliente_id = ? ORDER BY fecha DESC').all(c.id)
    const ventas = db.prepare('SELECT id, codigo, fecha, estado, total FROM ventas WHERE cliente_id = ? ORDER BY fecha DESC').all(c.id)
    const pagosDe = db.prepare('SELECT monto FROM pagos WHERE venta_id = ?')
    for (const v of ventas) Object.assign(v, saldoVenta(v.total, pagosDe.all(v.id)))
    res.json({ ...c, proformas, ventas })
  }))
  r.post('/clientes', exigir('clientes', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, reglasCliente)
    const info = db.prepare('INSERT INTO clientes (nombre, telefono, nit, direccion, ciudad, notas) VALUES (@nombre,@telefono,@nit,@direccion,@ciudad,@notas)').run(d)
    res.status(201).json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(info.lastInsertRowid))
  }))
  r.put('/clientes/:id', exigir('clientes', 'escribir'), manejar((req, res) => {
    const actual = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id)
    if (!actual) throw noEncontrado('Cliente')
    const d = { ...actual, ...validar(req.body, reglasCliente, { parcial: true }) }
    db.prepare('UPDATE clientes SET nombre=@nombre, telefono=@telefono, nit=@nit, direccion=@direccion, ciudad=@ciudad, notas=@notas WHERE id=@id').run(d)
    res.json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(actual.id))
  }))

  // ── Ajustes ──
  r.get('/ajustes', exigir(null), manejar((req, res) => {
    const salida = {}
    for (const [clave, defecto] of Object.entries(AJUSTES_POR_DEFECTO)) salida[clave] = leerAjuste(db, clave, defecto)
    res.json(salida)
  }))
  r.put('/ajustes/:clave', exigir('ajustes', 'escribir'), manejar((req, res) => {
    const clave = req.params.clave
    if (!AJUSTES_POR_DEFECTO[clave]) throw new ErrorHttp(404, 'Ajuste desconocido.')
    const permitido = Object.keys(AJUSTES_POR_DEFECTO[clave])
    const valor = { ...leerAjuste(db, clave, AJUSTES_POR_DEFECTO[clave]) }
    for (const k of permitido) if (req.body?.[k] !== undefined) valor[k] = typeof AJUSTES_POR_DEFECTO[clave][k] === 'number' ? Number(req.body[k]) : req.body[k]
    if (clave === 'planilla' && !(valor.salario_minimo > 0)) throw invalido('El salario mínimo debe ser mayor que cero.')
    guardarAjuste(db, clave, valor)
    registrar(db, req.usuario.id, 'ajustes', clave)
    res.json(valor)
  }))

  r.get('/bitacora', exigir('usuarios'), manejar((req, res) => {
    res.json(db.prepare('SELECT b.*, u.nombre FROM bitacora b LEFT JOIN usuarios u ON u.id = b.usuario_id ORDER BY b.id DESC LIMIT 200').all())
  }))

  return r
}
