// Proformas (cotizaciones), ventas y pagos.
import { Router } from 'express'
import { estaVencida, fechaVencimiento, saldoVenta, transicionPermitida, calcularTotales } from '@jerusalen/reportes'
import { exigir, filtroVendedor } from '../auth.js'
import { hoy } from '../config.js'
import { crearVenta, normalizarItems, registrarPago } from '../servicios.js'
import { invalido, manejar, noEncontrado, prohibido, registrar, siguienteCodigo, validar } from '../util.js'

/** Marca como vencidas las proformas enviadas/aceptadas que pasaron su validez. */
export function marcarVencidas(db, fecha = hoy()) {
  const abiertas = db.prepare("SELECT id, fecha, validez_dias, estado FROM proformas WHERE estado IN ('enviada','aceptada')").all()
  const upd = db.prepare("UPDATE proformas SET estado = 'vencida', actualizado_en = datetime('now') WHERE id = ?")
  let n = 0
  for (const p of abiertas) {
    if (estaVencida(p, fecha)) {
      upd.run(p.id)
      n++
    }
  }
  return n
}

const SQL_PROFORMA = `
  SELECT p.*, c.nombre AS cliente, c.telefono AS cliente_telefono, c.nit AS cliente_nit, c.direccion AS cliente_direccion,
         u.nombre AS vendedor, s.nombre AS sucursal, v.codigo AS venta_codigo
  FROM proformas p
  JOIN clientes c ON c.id = p.cliente_id
  JOIN usuarios u ON u.id = p.vendedor_id
  JOIN sucursales s ON s.id = p.sucursal_id
  LEFT JOIN ventas v ON v.id = p.venta_id`

const SQL_VENTA = `
  SELECT v.*, c.nombre AS cliente, c.telefono AS cliente_telefono, u.nombre AS vendedor, s.nombre AS sucursal,
         p.codigo AS proforma_codigo,
         COALESCE((SELECT SUM(monto) FROM pagos WHERE venta_id = v.id), 0) AS pagado
  FROM ventas v
  JOIN clientes c ON c.id = v.cliente_id
  JOIN usuarios u ON u.id = v.vendedor_id
  JOIN sucursales s ON s.id = v.sucursal_id
  LEFT JOIN proformas p ON p.id = v.proforma_id`

export function rutasComercial(db) {
  const r = Router()

  const cargarProforma = (id, req) => {
    const p = db.prepare(`${SQL_PROFORMA} WHERE p.id = ?`).get(id)
    if (!p) throw noEncontrado('Proforma')
    const soloMio = filtroVendedor(req)
    if (soloMio && p.vendedor_id !== soloMio) throw prohibido('Esta proforma es de otro vendedor.')
    p.items = db.prepare('SELECT * FROM proforma_items WHERE proforma_id = ? ORDER BY orden').all(p.id)
    p.vence = fechaVencimiento(p)
    return p
  }

  /** Crea el cliente al vuelo si viene { cliente: { nombre, telefono } } sin cliente_id. */
  const resolverCliente = (body) => {
    if (body.cliente_id) return Number(body.cliente_id)
    const c = body.cliente
    if (!c?.nombre?.trim()) throw invalido('Elige un cliente o escribe su nombre.')
    const info = db.prepare('INSERT INTO clientes (nombre, telefono, nit) VALUES (?,?,?)').run(c.nombre.trim().slice(0, 120), String(c.telefono ?? '').slice(0, 40), String(c.nit ?? '').slice(0, 30))
    return Number(info.lastInsertRowid)
  }

  const reglasProforma = {
    sucursal_id: { tipo: 'entero', nombre: 'sucursal' },
    vendedor_id: { tipo: 'entero' },
    fecha: { tipo: 'fecha' },
    validez_dias: { tipo: 'entero', min: 1, max: 365, nombre: 'validez' },
    descuento_pct: { tipo: 'numero', min: 0, max: 100, nombre: 'descuento' },
    notas: { tipo: 'texto', largo: 2000 },
    estado: { tipo: 'texto', opciones: ['borrador', 'enviada'] },
  }

  const guardarItems = (proformaId, items) => {
    db.prepare('DELETE FROM proforma_items WHERE proforma_id = ?').run(proformaId)
    const ins = db.prepare(`INSERT INTO proforma_items (proforma_id, orden, tipo, material_id, descripcion, ancho_cm, alto_cm, piezas, cantidad, unidad, precio_unit, total)
                            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    for (const i of items) ins.run(proformaId, i.orden, i.tipo, i.material_id ?? null, i.descripcion, i.ancho_cm ?? null, i.alto_cm ?? null, i.piezas ?? null, i.cantidad, i.unidad, i.precio_unit, i.total)
  }

  // ── Proformas ──
  r.get('/proformas', exigir('proformas'), manejar((req, res) => {
    marcarVencidas(db)
    const cond = []
    const args = []
    const soloMio = filtroVendedor(req)
    if (soloMio) { cond.push('p.vendedor_id = ?'); args.push(soloMio) }
    else if (req.query.vendedor) { cond.push('p.vendedor_id = ?'); args.push(Number(req.query.vendedor)) }
    if (req.query.estado) { cond.push('p.estado = ?'); args.push(req.query.estado) }
    if (req.query.sucursal) { cond.push('p.sucursal_id = ?'); args.push(Number(req.query.sucursal)) }
    if (req.query.desde) { cond.push('p.fecha >= ?'); args.push(req.query.desde) }
    if (req.query.hasta) { cond.push('p.fecha <= ?'); args.push(req.query.hasta) }
    if (req.query.q) { cond.push('(p.codigo LIKE ? OR c.nombre LIKE ?)'); args.push(`%${req.query.q}%`, `%${req.query.q}%`) }
    const filas = db.prepare(`${SQL_PROFORMA} ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY p.fecha DESC, p.id DESC LIMIT ?`).all(...args, Math.min(1000, Number(req.query.limite) || 300))
    res.json(filas.map((p) => ({ ...p, vence: fechaVencimiento(p) })))
  }))

  r.get('/proformas/:id', exigir('proformas'), manejar((req, res) => res.json(cargarProforma(req.params.id, req))))

  r.post('/proformas', exigir('proformas', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, reglasProforma)
    const items = normalizarItems(db, req.body.items)
    const id = db.transaction(() => {
      const clienteId = resolverCliente(req.body)
      const fecha = d.fecha ?? hoy()
      const vendedorId = req.usuario.rol === 'vendedor' ? req.usuario.id : d.vendedor_id ?? req.usuario.id
      const sucursalId = d.sucursal_id ?? req.usuario.sucursal_id ?? 1
      const t = calcularTotales(items, d.descuento_pct ?? 0)
      const estado = d.estado ?? 'borrador'
      const info = db
        .prepare(`INSERT INTO proformas (codigo, cliente_id, vendedor_id, sucursal_id, fecha, validez_dias, estado, descuento_pct, subtotal, total, notas, enviada_en)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(siguienteCodigo(db, 'proformas', 'PRO', fecha.slice(0, 4)), clienteId, vendedorId, sucursalId, fecha, d.validez_dias ?? 15, estado, t.descuentoPct, t.subtotal, t.total, d.notas ?? '', estado === 'enviada' ? fecha : null)
      guardarItems(info.lastInsertRowid, items)
      return Number(info.lastInsertRowid)
    })()
    registrar(db, req.usuario.id, 'proforma creada', id)
    res.status(201).json(cargarProforma(id, req))
  }))

  r.put('/proformas/:id', exigir('proformas', 'escribir'), manejar((req, res) => {
    const p = cargarProforma(req.params.id, req)
    if (['convertida', 'rechazada'].includes(p.estado)) throw invalido('Una proforma convertida o rechazada ya no se puede editar. Duplícala para hacer una nueva.')
    const d = validar(req.body, reglasProforma, { parcial: true })
    const items = req.body.items ? normalizarItems(db, req.body.items) : p.items
    db.transaction(() => {
      const clienteId = req.body.cliente_id || req.body.cliente ? resolverCliente(req.body) : p.cliente_id
      const t = calcularTotales(items, d.descuento_pct ?? p.descuento_pct)
      const vendedorId = req.usuario.rol === 'vendedor' ? p.vendedor_id : d.vendedor_id ?? p.vendedor_id
      db.prepare(`UPDATE proformas SET cliente_id=?, vendedor_id=?, sucursal_id=?, fecha=?, validez_dias=?, descuento_pct=?, subtotal=?, total=?, notas=?, actualizado_en=datetime('now') WHERE id=?`)
        .run(clienteId, vendedorId, d.sucursal_id ?? p.sucursal_id, d.fecha ?? p.fecha, d.validez_dias ?? p.validez_dias, t.descuentoPct, t.subtotal, t.total, d.notas ?? p.notas, p.id)
      if (req.body.items) guardarItems(p.id, items)
      // Una vencida que se edita con nueva fecha vuelve a quedar enviada
      if (p.estado === 'vencida' && d.fecha) db.prepare("UPDATE proformas SET estado = 'enviada' WHERE id = ?").run(p.id)
    })()
    res.json(cargarProforma(p.id, req))
  }))

  r.post('/proformas/:id/estado', exigir('proformas', 'escribir'), manejar((req, res) => {
    const p = cargarProforma(req.params.id, req)
    const { estado, motivo } = validar(req.body, { estado: { tipo: 'texto', requerido: true }, motivo: { tipo: 'texto', largo: 300, defecto: '' } })
    if (estado === 'convertida') throw invalido('Para convertir en venta usa «Convertir en venta».')
    if (!transicionPermitida(p.estado, estado)) throw invalido(`No se puede pasar de «${p.estado}» a «${estado}».`)
    const nuevaFecha = estado === 'enviada' && p.estado === 'vencida' ? hoy() : p.fecha
    db.prepare(`UPDATE proformas SET estado=?, motivo=?, fecha=?, enviada_en=COALESCE(enviada_en, CASE WHEN ?='enviada' THEN ? END), actualizado_en=datetime('now') WHERE id=?`)
      .run(estado, estado === 'rechazada' ? motivo : p.motivo, nuevaFecha, estado, hoy(), p.id)
    registrar(db, req.usuario.id, `proforma ${estado}`, p.codigo)
    res.json(cargarProforma(p.id, req))
  }))

  r.post('/proformas/:id/convertir', exigir('ventas', 'escribir'), manejar((req, res) => {
    const p = cargarProforma(req.params.id, req)
    if (!['enviada', 'aceptada', 'borrador'].includes(p.estado)) throw invalido(`Una proforma «${p.estado}» no se puede convertir en venta.`)
    const ventaId = db.transaction(() => {
      const id = crearVenta(db, {
        cliente_id: p.cliente_id,
        vendedor_id: p.vendedor_id,
        sucursal_id: p.sucursal_id,
        fecha: req.body?.fecha ?? hoy(),
        proforma_id: p.id,
        descuento_pct: p.descuento_pct,
        notas: p.notas,
        items: p.items,
        pago: req.body?.pago,
      }, { usuarioId: req.usuario.id, hoy: hoy() })
      db.prepare("UPDATE proformas SET estado='convertida', venta_id=?, actualizado_en=datetime('now') WHERE id=?").run(id, p.id)
      return id
    })()
    registrar(db, req.usuario.id, 'proforma convertida', p.codigo)
    res.status(201).json(cargarVenta(ventaId))
  }))

  r.post('/proformas/:id/duplicar', exigir('proformas', 'escribir'), manejar((req, res) => {
    const p = cargarProforma(req.params.id, req)
    const fecha = hoy()
    const id = db.transaction(() => {
      const info = db
        .prepare(`INSERT INTO proformas (codigo, cliente_id, vendedor_id, sucursal_id, fecha, validez_dias, estado, descuento_pct, subtotal, total, notas)
                  VALUES (?,?,?,?,?,?, 'borrador', ?,?,?,?)`)
        .run(siguienteCodigo(db, 'proformas', 'PRO', fecha.slice(0, 4)), p.cliente_id, req.usuario.rol === 'vendedor' ? req.usuario.id : p.vendedor_id, p.sucursal_id, fecha, p.validez_dias, p.descuento_pct, p.subtotal, p.total, p.notas)
      guardarItems(info.lastInsertRowid, p.items)
      return Number(info.lastInsertRowid)
    })()
    res.status(201).json(cargarProforma(id, req))
  }))

  // ── Ventas ──
  function cargarVenta(id, req) {
    const v = db.prepare(`${SQL_VENTA} WHERE v.id = ?`).get(id)
    if (!v) throw noEncontrado('Venta')
    if (req) {
      const soloMio = filtroVendedor(req)
      if (soloMio && v.vendedor_id !== soloMio) throw prohibido('Esta venta es de otro vendedor.')
    }
    v.items = db.prepare('SELECT * FROM venta_items WHERE venta_id = ? ORDER BY orden').all(v.id)
    v.pagos = db.prepare('SELECT p.*, u.nombre AS usuario FROM pagos p LEFT JOIN usuarios u ON u.id = p.usuario_id WHERE venta_id = ? ORDER BY fecha, id').all(v.id)
    Object.assign(v, saldoVenta(v.total, v.pagos))
    return v
  }

  r.get('/ventas', exigir('ventas'), manejar((req, res) => {
    const cond = []
    const args = []
    const soloMio = filtroVendedor(req)
    if (soloMio) { cond.push('v.vendedor_id = ?'); args.push(soloMio) }
    else if (req.query.vendedor) { cond.push('v.vendedor_id = ?'); args.push(Number(req.query.vendedor)) }
    if (req.query.sucursal) { cond.push('v.sucursal_id = ?'); args.push(Number(req.query.sucursal)) }
    if (req.query.estado) { cond.push('v.estado = ?'); args.push(req.query.estado) }
    if (req.query.desde) { cond.push('v.fecha >= ?'); args.push(req.query.desde) }
    if (req.query.hasta) { cond.push('v.fecha <= ?'); args.push(req.query.hasta) }
    if (req.query.q) { cond.push('(v.codigo LIKE ? OR c.nombre LIKE ?)'); args.push(`%${req.query.q}%`, `%${req.query.q}%`) }
    let filas = db.prepare(`${SQL_VENTA} ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY v.fecha DESC, v.id DESC LIMIT ?`).all(...args, Math.min(2000, Number(req.query.limite) || 300))
    filas = filas.map((v) => ({ ...v, ...saldoVenta(v.total, [{ monto: v.pagado }]) }))
    if (req.query.conSaldo === '1') filas = filas.filter((v) => v.saldo > 0 && v.estado === 'vigente')
    res.json(filas)
  }))

  r.get('/ventas/:id', exigir('ventas'), manejar((req, res) => res.json(cargarVenta(req.params.id, req))))

  r.post('/ventas', exigir('ventas', 'escribir'), manejar((req, res) => {
    const id = db.transaction(() => {
      const clienteId = resolverCliente(req.body)
      return crearVenta(db, {
        ...req.body,
        cliente_id: clienteId,
        vendedor_id: req.usuario.rol === 'vendedor' ? req.usuario.id : req.body.vendedor_id ?? req.usuario.id,
        sucursal_id: req.body.sucursal_id ?? req.usuario.sucursal_id ?? 1,
      }, { usuarioId: req.usuario.id, hoy: hoy() })
    })()
    registrar(db, req.usuario.id, 'venta directa', id)
    res.status(201).json(cargarVenta(id))
  }))

  r.post('/ventas/:id/pagos', exigir('ventas', 'escribir'), manejar((req, res) => {
    const v = cargarVenta(req.params.id, req)
    registrarPago(db, v.id, { fecha: hoy(), ...req.body }, req.usuario.id)
    registrar(db, req.usuario.id, 'pago', `${v.codigo} Bs ${req.body?.monto}`)
    res.status(201).json(cargarVenta(v.id))
  }))

  r.post('/ventas/:id/anular', exigir('ventas', 'escribir'), manejar((req, res) => {
    if (!['administrador'].includes(req.usuario.rol)) throw prohibido('Solo el administrador puede anular ventas.')
    const v = cargarVenta(req.params.id, req)
    if (v.estado === 'anulada') throw invalido('La venta ya está anulada.')
    const motivo = String(req.body?.motivo ?? '').slice(0, 300)
    db.transaction(() => {
      db.prepare("UPDATE ventas SET estado='anulada', notas = notas || ? WHERE id = ?").run(`\n[Anulada ${hoy()}] ${motivo}`, v.id)
      // Devuelve insumos al stock
      for (const i of v.items) {
        if (i.tipo === 'insumo' && i.material_id) {
          db.prepare('UPDATE existencias SET cantidad = cantidad + ? WHERE material_id = ? AND sucursal_id = ?').run(i.cantidad, i.material_id, v.sucursal_id)
          db.prepare("INSERT INTO movimientos (fecha, material_id, sucursal_id, tipo, cantidad, referencia, usuario_id) VALUES (?,?,?,'ajuste',?,?,?)").run(hoy(), i.material_id, v.sucursal_id, i.cantidad, `Anulación ${v.codigo}`, req.usuario.id)
        }
      }
      if (v.proforma_id) db.prepare("UPDATE proformas SET estado='aceptada', venta_id=NULL WHERE id = ?").run(v.proforma_id)
    })()
    registrar(db, req.usuario.id, 'venta anulada', v.codigo)
    res.json(cargarVenta(v.id))
  }))

  return r
}
