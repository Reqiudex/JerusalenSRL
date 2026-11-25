// Materiales, existencias, movimientos, planchas (matriz de corte), retazos y lista de compras.
import { Router } from 'express'
import { resumen as resumenPlancha } from '@jerusalen/matriz-corte/geometria'
import { recomendacionCompra, tendencias } from '@jerusalen/reportes'
import { exigir } from '../auth.js'
import { hoy } from '../config.js'
import { lineasVendidas } from '../consultas.js'
import { datosPlancha, guardarCortes, moverStock, sincronizarExistenciaPlanchas } from '../servicios.js'
import { invalido, manejar, noEncontrado, r2, registrar, siguienteCodigo, validar } from '../util.js'

export function rutasInventario(db) {
  const r = Router()

  // ── Materiales ──
  const reglasMaterial = {
    codigo: { tipo: 'texto', requerido: true, largo: 30, nombre: 'código' },
    nombre: { tipo: 'texto', requerido: true, largo: 120 },
    categoria: { tipo: 'texto', requerido: true, opciones: ['plancha', 'insumo', 'servicio'], nombre: 'categoría' },
    tipo: { tipo: 'texto', largo: 40, defecto: '' },
    unidad: { tipo: 'texto', largo: 20, defecto: 'm2' },
    espesor_cm: { tipo: 'numero', min: 0 },
    ancho_cm: { tipo: 'entero', min: 1, max: 2000 },
    alto_cm: { tipo: 'entero', min: 1, max: 2000 },
    origen: { tipo: 'texto', largo: 60, defecto: '' },
    costo: { tipo: 'numero', min: 0, defecto: 0 },
    precio: { tipo: 'numero', min: 0, defecto: 0 },
    rendimiento: { tipo: 'numero', min: 0 },
    presentacion: { tipo: 'numero', min: 0 },
    activo: { tipo: 'bool', defecto: 1 },
  }
  r.get('/materiales', exigir(null), manejar((req, res) => {
    const cond = []
    const args = []
    if (req.query.categoria) { cond.push('m.categoria = ?'); args.push(req.query.categoria) }
    if (req.query.activos !== '0') cond.push('m.activo = 1')
    if (req.query.q) { cond.push('(m.nombre LIKE ? OR m.codigo LIKE ?)'); args.push(`%${req.query.q}%`, `%${req.query.q}%`) }
    const filas = db.prepare(`SELECT m.*, COALESCE((SELECT SUM(cantidad) FROM existencias e WHERE e.material_id = m.id), 0) AS stock_total
                              FROM materiales m ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY m.categoria, m.nombre`).all(...args)
    res.json(filas)
  }))
  r.post('/materiales', exigir('inventario', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, reglasMaterial)
    if (db.prepare('SELECT 1 FROM materiales WHERE codigo = ?').get(d.codigo)) throw invalido('Ya existe un material con ese código.')
    const info = db.prepare(`INSERT INTO materiales (codigo, nombre, categoria, tipo, unidad, espesor_cm, ancho_cm, alto_cm, origen, costo, precio, rendimiento, presentacion, activo)
      VALUES (@codigo,@nombre,@categoria,@tipo,@unidad,@espesor_cm,@ancho_cm,@alto_cm,@origen,@costo,@precio,@rendimiento,@presentacion,@activo)`).run({ espesor_cm: null, ancho_cm: null, alto_cm: null, rendimiento: null, presentacion: null, ...d })
    res.status(201).json(db.prepare('SELECT * FROM materiales WHERE id = ?').get(info.lastInsertRowid))
  }))
  r.put('/materiales/:id', exigir('inventario', 'escribir'), manejar((req, res) => {
    const actual = db.prepare('SELECT * FROM materiales WHERE id = ?').get(req.params.id)
    if (!actual) throw noEncontrado('Material')
    const d = { ...actual, ...validar(req.body, reglasMaterial, { parcial: true }) }
    db.prepare(`UPDATE materiales SET codigo=@codigo, nombre=@nombre, categoria=@categoria, tipo=@tipo, unidad=@unidad, espesor_cm=@espesor_cm, ancho_cm=@ancho_cm,
      alto_cm=@alto_cm, origen=@origen, costo=@costo, precio=@precio, rendimiento=@rendimiento, presentacion=@presentacion, activo=@activo WHERE id=@id`).run(d)
    res.json(db.prepare('SELECT * FROM materiales WHERE id = ?').get(actual.id))
  }))

  // ── Existencias ──
  r.get('/existencias', exigir('inventario'), manejar((req, res) => {
    const args = []
    let filtro = ''
    if (req.query.sucursal) {
      filtro = 'AND e.sucursal_id = ?'
      args.push(Number(req.query.sucursal))
    }
    const filas = db.prepare(`
      SELECT e.*, m.codigo, m.nombre, m.categoria, m.tipo, m.unidad, m.costo, m.precio, s.nombre AS sucursal,
        (SELECT COUNT(*) FROM retazos x WHERE x.material_id = e.material_id AND x.sucursal_id = e.sucursal_id AND x.estado <> 'usado') AS retazos,
        (SELECT COALESCE(SUM(libre_m2),0) FROM retazos x WHERE x.material_id = e.material_id AND x.sucursal_id = e.sucursal_id AND x.estado <> 'usado') AS retazos_m2,
        (SELECT COUNT(*) FROM planchas p WHERE p.material_id = e.material_id AND p.sucursal_id = e.sucursal_id AND p.estado = 'en_corte') AS planchas_en_corte
      FROM existencias e JOIN materiales m ON m.id = e.material_id JOIN sucursales s ON s.id = e.sucursal_id
      WHERE m.activo = 1 AND m.categoria <> 'servicio' ${filtro}
      ORDER BY m.categoria, m.nombre, s.id`).all(...args)
    res.json(filas.map((f) => ({ ...f, retazos_m2: r2(f.retazos_m2), estado: f.cantidad < f.minimo ? 'bajo' : f.cantidad < f.minimo * 1.3 ? 'justo' : 'ok', valor: r2(f.cantidad * f.costo * (f.categoria === 'plancha' ? 5.1 : 1)) })))
  }))
  r.put('/existencias', exigir('inventario', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, { material_id: { tipo: 'entero', requerido: true }, sucursal_id: { tipo: 'entero', requerido: true }, minimo: { tipo: 'numero', requerido: true, min: 0, nombre: 'mínimo' } })
    db.prepare('INSERT INTO existencias (material_id, sucursal_id, cantidad, minimo) VALUES (?,?,0,?) ON CONFLICT(material_id, sucursal_id) DO UPDATE SET minimo = excluded.minimo').run(d.material_id, d.sucursal_id, d.minimo)
    res.json({ ok: true })
  }))

  // ── Movimientos (entradas, salidas y ajustes) ──
  r.get('/movimientos', exigir('inventario'), manejar((req, res) => {
    const args = []
    const cond = []
    if (req.query.material) { cond.push('mv.material_id = ?'); args.push(Number(req.query.material)) }
    if (req.query.sucursal) { cond.push('mv.sucursal_id = ?'); args.push(Number(req.query.sucursal)) }
    res.json(db.prepare(`SELECT mv.*, m.nombre AS material, m.unidad, s.nombre AS sucursal, u.nombre AS usuario FROM movimientos mv
      JOIN materiales m ON m.id = mv.material_id JOIN sucursales s ON s.id = mv.sucursal_id LEFT JOIN usuarios u ON u.id = mv.usuario_id
      ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY mv.id DESC LIMIT 300`).all(...args))
  }))
  r.post('/movimientos', exigir('inventario', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, {
      material_id: { tipo: 'entero', requerido: true, nombre: 'material' },
      sucursal_id: { tipo: 'entero', requerido: true, nombre: 'sucursal' },
      tipo: { tipo: 'texto', requerido: true, opciones: ['entrada', 'salida', 'ajuste'] },
      cantidad: { tipo: 'numero', requerido: true, min: 0 },
      costo_unit: { tipo: 'numero', min: 0, defecto: 0 },
      referencia: { tipo: 'texto', largo: 120, defecto: '' },
      registrar_egreso: { tipo: 'bool', defecto: 1 },
      fecha: { tipo: 'fecha' },
    })
    const m = db.prepare('SELECT * FROM materiales WHERE id = ?').get(d.material_id)
    if (!m) throw noEncontrado('Material')
    if (m.categoria === 'servicio') throw invalido('Los servicios no tienen stock.')
    const fecha = d.fecha ?? hoy()
    const resultado = db.transaction(() => {
      if (m.categoria === 'plancha') {
        // Las planchas se manejan una por una (cada una tendrá su matriz de corte)
        if (d.tipo !== 'entrada') throw invalido('Las planchas se dan de baja desde su matriz de corte o desde la lista de planchas.')
        if (!Number.isInteger(d.cantidad) || d.cantidad < 1 || d.cantidad > 200) throw invalido('Indica cuántas planchas enteras entran (1 a 200).')
        const creadas = []
        for (let i = 0; i < d.cantidad; i++) creadas.push(crearPlancha(db, { material_id: m.id, sucursal_id: d.sucursal_id, fecha, costo: d.costo_unit || m.costo }))
        sincronizarExistenciaPlanchas(db, m.id, d.sucursal_id)
        db.prepare("INSERT INTO movimientos (fecha, material_id, sucursal_id, tipo, cantidad, costo_unit, referencia, usuario_id) VALUES (?,?,?,'entrada',?,?,?,?)").run(fecha, m.id, d.sucursal_id, d.cantidad, d.costo_unit, d.referencia, req.usuario.id)
        if (d.registrar_egreso && d.costo_unit > 0) {
          const area = ((m.ancho_cm ?? 300) * (m.alto_cm ?? 170)) / 10000
          registrarEgresoCompra(db, { fecha, sucursal_id: d.sucursal_id, monto: r2(d.costo_unit * area * d.cantidad), descripcion: `${d.cantidad} plancha(s) ${m.nombre}`, proveedor: d.referencia, usuarioId: req.usuario.id })
        }
        return { planchas: creadas }
      }
      const cantidad = d.tipo === 'salida' ? -d.cantidad : d.cantidad
      moverStock(db, { material_id: m.id, sucursal_id: d.sucursal_id, cantidad, tipo: d.tipo, referencia: d.referencia, fecha, usuarioId: req.usuario.id, costo_unit: d.costo_unit })
      if (d.tipo === 'entrada' && d.registrar_egreso && d.costo_unit > 0) {
        registrarEgresoCompra(db, { fecha, sucursal_id: d.sucursal_id, monto: r2(d.costo_unit * d.cantidad), descripcion: `${d.cantidad} ${m.unidad} ${m.nombre}`, proveedor: d.referencia, usuarioId: req.usuario.id })
      }
      return { ok: true }
    })()
    registrar(db, req.usuario.id, `movimiento ${d.tipo}`, `${m.nombre} ${d.cantidad}`)
    res.status(201).json(resultado)
  }))

  // ── Planchas y matriz de corte ──
  const SQL_PLANCHA = `SELECT p.*, m.nombre AS material, m.tipo AS material_tipo, s.nombre AS sucursal,
      (SELECT COUNT(*) FROM plancha_cortes c WHERE c.plancha_id = p.id) AS cortes
    FROM planchas p JOIN materiales m ON m.id = p.material_id JOIN sucursales s ON s.id = p.sucursal_id`
  const conResumen = (p) => {
    const datos = datosPlancha(db, p)
    const res = resumenPlancha({ plancha: datos.plancha, cortes: datos.cortes })
    return { ...p, resumen: { vendido: r2(res.vendido.porcentaje), retazo: r2(res.retazo.porcentaje), merma: r2(res.merma.porcentaje), libre: r2(res.libre.porcentaje), libreM2: r2(res.libre.m2) } }
  }
  r.get('/planchas', exigir('planchas'), manejar((req, res) => {
    const cond = []
    const args = []
    if (req.query.sucursal) { cond.push('p.sucursal_id = ?'); args.push(Number(req.query.sucursal)) }
    if (req.query.material) { cond.push('p.material_id = ?'); args.push(Number(req.query.material)) }
    if (req.query.estado) { cond.push('p.estado = ?'); args.push(req.query.estado) }
    if (req.query.q) { cond.push('(p.codigo LIKE ? OR m.nombre LIKE ?)'); args.push(`%${req.query.q}%`, `%${req.query.q}%`) }
    const filas = db.prepare(`${SQL_PLANCHA} ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY CASE p.estado WHEN 'en_corte' THEN 0 WHEN 'disponible' THEN 1 ELSE 2 END, p.fecha_ingreso DESC LIMIT 500`).all(...args)
    res.json(filas.map(conResumen))
  }))
  r.post('/planchas', exigir('planchas', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, {
      material_id: { tipo: 'entero', requerido: true, nombre: 'material' },
      sucursal_id: { tipo: 'entero', requerido: true, nombre: 'sucursal' },
      ancho: { tipo: 'entero', min: 1, max: 2000 },
      alto: { tipo: 'entero', min: 1, max: 2000 },
      espesor: { tipo: 'numero', min: 0 },
      codigo: { tipo: 'texto', largo: 30 },
      costo: { tipo: 'numero', min: 0 },
    })
    const id = db.transaction(() => {
      const nuevo = crearPlancha(db, { ...d, fecha: hoy() })
      const p = db.prepare('SELECT material_id, sucursal_id FROM planchas WHERE id = ?').get(nuevo)
      sincronizarExistenciaPlanchas(db, p.material_id, p.sucursal_id)
      return nuevo
    })()
    res.status(201).json(conResumen(db.prepare(`${SQL_PLANCHA} WHERE p.id = ?`).get(id)))
  }))
  r.get('/planchas/:id', exigir('planchas'), manejar((req, res) => {
    const p = db.prepare(`${SQL_PLANCHA} WHERE p.id = ?`).get(req.params.id)
    if (!p) throw noEncontrado('Plancha')
    res.json(conResumen(p))
  }))
  // Contrato de la matriz de corte: GET/POST /api/planchas/:id/cortes
  r.get('/planchas/:id/cortes', exigir('planchas'), manejar((req, res) => {
    const p = db.prepare('SELECT p.*, m.nombre AS material FROM planchas p JOIN materiales m ON m.id = p.material_id WHERE p.id = ?').get(req.params.id)
    if (!p) throw noEncontrado('Plancha')
    res.json(datosPlancha(db, p))
  }))
  r.post('/planchas/:id/cortes', exigir('planchas', 'escribir'), manejar((req, res) => {
    const resultado = db.transaction(() => guardarCortes(db, Number(req.params.id), req.body, { usuarioId: req.usuario.id, fecha: hoy() }))()
    registrar(db, req.usuario.id, 'cortes guardados', `plancha ${req.params.id}`)
    const p = db.prepare('SELECT p.*, m.nombre AS material FROM planchas p JOIN materiales m ON m.id = p.material_id WHERE p.id = ?').get(req.params.id)
    res.json({ ...datosPlancha(db, p), estado: resultado.estado, retazos: resultado.retazos })
  }))
  r.get('/planchas/:id/historial', exigir('planchas'), manejar((req, res) => {
    res.json(db.prepare('SELECT h.id, h.fecha, h.resumen, u.nombre AS usuario FROM plancha_historial h LEFT JOIN usuarios u ON u.id = h.usuario_id WHERE h.plancha_id = ? ORDER BY h.id DESC').all(req.params.id))
  }))
  r.get('/planchas/:id/historial/:hid', exigir('planchas'), manejar((req, res) => {
    const h = db.prepare('SELECT * FROM plancha_historial WHERE plancha_id = ? AND id = ?').get(req.params.id, req.params.hid)
    if (!h) throw noEncontrado('Versión')
    res.json({ ...h, datos: JSON.parse(h.datos) })
  }))

  // ── Retazos ──
  r.get('/retazos', exigir('inventario'), manejar((req, res) => {
    const cond = ["x.estado <> 'usado'"]
    const args = []
    if (req.query.todos === '1') cond.pop()
    if (req.query.sucursal) { cond.push('x.sucursal_id = ?'); args.push(Number(req.query.sucursal)) }
    if (req.query.material) { cond.push('x.material_id = ?'); args.push(Number(req.query.material)) }
    if (req.query.minAncho) { cond.push('x.ancho >= ?'); args.push(Number(req.query.minAncho)) }
    if (req.query.minAlto) { cond.push('x.alto >= ?'); args.push(Number(req.query.minAlto)) }
    res.json(db.prepare(`SELECT x.*, m.nombre AS material, s.nombre AS sucursal, p.codigo AS plancha FROM retazos x
      JOIN materiales m ON m.id = x.material_id JOIN sucursales s ON s.id = x.sucursal_id JOIN planchas p ON p.id = x.plancha_id
      ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY m.nombre, x.m2 DESC`).all(...args))
  }))
  r.put('/retazos/:id', exigir('inventario', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, { estado: { tipo: 'texto', requerido: true, opciones: ['disponible', 'usado'] } })
    const info = db.prepare('UPDATE retazos SET estado = ? WHERE id = ?').run(d.estado, req.params.id)
    if (!info.changes) throw noEncontrado('Retazo')
    res.json({ ok: true })
  }))

  // ── Lista de compras ──
  r.get('/compras', exigir('inventario'), manejar((req, res) => {
    res.json(listaCompras(db, { sucursal: req.query.sucursal ? Number(req.query.sucursal) : null, fecha: hoy() }))
  }))

  return r
}

export function crearPlancha(db, { material_id, sucursal_id, fecha, ancho, alto, espesor, codigo, costo }) {
  const m = db.prepare('SELECT * FROM materiales WHERE id = ?').get(material_id)
  if (!m || m.categoria !== 'plancha') throw invalido('El material no es una plancha.')
  if (!db.prepare('SELECT 1 FROM sucursales WHERE id = ?').get(sucursal_id)) throw invalido('La sucursal no existe.')
  const cod = codigo || siguienteCodigo(db, 'planchas', m.codigo.split('-')[0] || 'PL', fecha.slice(0, 4))
  if (db.prepare('SELECT 1 FROM planchas WHERE codigo = ?').get(cod)) throw invalido('Ya existe una plancha con ese código.')
  const info = db.prepare('INSERT INTO planchas (codigo, material_id, sucursal_id, ancho, alto, espesor, fecha_ingreso, costo) VALUES (?,?,?,?,?,?,?,?)')
    .run(cod, m.id, sucursal_id, ancho ?? m.ancho_cm ?? 300, alto ?? m.alto_cm ?? 170, espesor ?? m.espesor_cm ?? 2, fecha, costo ?? m.costo)
  return Number(info.lastInsertRowid)
}

export function registrarEgresoCompra(db, { fecha, sucursal_id, monto, descripcion, proveedor = '', usuarioId }) {
  db.prepare("INSERT INTO egresos (fecha, sucursal_id, categoria, descripcion, monto, proveedor, usuario_id) VALUES (?,?,'compras',?,?,?,?)").run(fecha, sucursal_id, descripcion, monto, proveedor, usuarioId ?? null)
}

/**
 * Lista de compras: stock bajo + demanda proyectada (con tendencia).
 * Las compras se hacen para toda la empresa (la importación llega a la fábrica y se reparte),
 * así que se agrupa por material: stock y mínimo suman las sucursales (o solo la elegida).
 */
export function listaCompras(db, { sucursal = null, fecha }) {
  const lineas = lineasVendidas(db, { hasta: fecha, desde: `${Number(fecha.slice(0, 4)) - 1}${fecha.slice(4)}`, sucursal })
  const filas = db.prepare(`
    SELECT e.material_id, e.sucursal_id, e.cantidad, e.minimo, m.nombre, m.unidad, m.categoria, m.costo, m.ancho_cm, m.alto_cm, s.nombre AS sucursal
    FROM existencias e JOIN materiales m ON m.id = e.material_id JOIN sucursales s ON s.id = e.sucursal_id
    WHERE m.activo = 1 AND m.categoria <> 'servicio' AND m.precio > 0 ${sucursal ? 'AND e.sucursal_id = ?' : ''}`).all(...(sucursal ? [sucursal] : []))
  const porMaterial = new Map()
  for (const f of filas) {
    const x = porMaterial.get(f.material_id) ?? { ...f, stock: 0, minimo: 0, bajas: [] }
    x.stock += f.cantidad
    x.minimo += f.minimo
    if (f.cantidad < f.minimo) x.bajas.push(f.sucursal)
    porMaterial.set(f.material_id, x)
  }
  const area = (l) => ((l.ancho_cm ?? 300) * (l.alto_cm ?? 170)) / 10000
  // Las planchas se venden en m² pero se compran enteras: se convierte la demanda a planchas
  const lineasConv = lineas.map((l) => (l.categoria === 'plancha' ? { ...l, cantidad: l.cantidad / area(l), sucursal_id: undefined } : { ...l, sucursal_id: undefined }))
  const tend = tendencias(lineasConv, { hoy: fecha })
  const existencias = [...porMaterial.values()].map(({ sucursal_id: _s, cantidad: _c, ...x }) => ({
    ...x,
    unidad: x.categoria === 'plancha' ? 'planchas' : x.unidad,
    sucursal: x.bajas.length ? `Falta en: ${x.bajas.join(', ')}` : sucursal ? filas.find((f) => f.material_id === x.material_id)?.sucursal : 'Toda la empresa',
  }))
  return recomendacionCompra(existencias, lineasConv, { hoy: fecha, tendencia: tend })
    .map((x) => ({ ...x, costoEstimado: r2(x.sugerido * x.costo * (x.categoria === 'plancha' ? area(x) : 1)) }))
}
