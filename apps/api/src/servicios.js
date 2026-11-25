// Operaciones de negocio reutilizadas por las rutas y por la semilla.
import { cargarDatos, retazosParaInventario, resumen as resumenPlancha } from '@jerusalen/matriz-corte/geometria'
import { calcularTotales, cantidadItem, saldoVenta, totalItem } from '@jerusalen/reportes'
import { ErrorHttp, invalido, r2, siguienteCodigo, validar } from './util.js'

// ───────────────────────── Ítems de proformas / ventas ─────────────────────────

const REGLAS_ITEM = {
  tipo: { tipo: 'texto', requerido: true, opciones: ['plancha', 'pieza', 'servicio', 'insumo'] },
  material_id: { tipo: 'entero' },
  descripcion: { tipo: 'texto', requerido: true, largo: 200, nombre: 'descripción' },
  ancho_cm: { tipo: 'numero', min: 0 },
  alto_cm: { tipo: 'numero', min: 0 },
  piezas: { tipo: 'entero', min: 1 },
  cantidad: { tipo: 'numero', min: 0 },
  unidad: { tipo: 'texto', defecto: 'm2', largo: 20 },
  precio_unit: { tipo: 'numero', requerido: true, min: 0, nombre: 'precio' },
}

/** Valida y normaliza ítems: calcula cantidad (piezas por m²) y total. */
export function normalizarItems(db, items) {
  if (!Array.isArray(items) || items.length === 0) throw invalido('Agrega al menos un ítem.')
  if (items.length > 100) throw invalido('Máximo 100 ítems.')
  const costoDe = db.prepare('SELECT costo, unidad FROM materiales WHERE id = ?')
  return items.map((bruto, i) => {
    let item
    try {
      item = validar(bruto, REGLAS_ITEM)
    } catch (e) {
      throw invalido(`Ítem ${i + 1}: ${e.message}`)
    }
    const material = item.material_id ? costoDe.get(item.material_id) : null
    if (item.material_id && !material) throw invalido(`Ítem ${i + 1}: el material no existe.`)
    const cantidad = cantidadItem(item)
    if (!(cantidad > 0)) throw invalido(`Ítem ${i + 1}: la cantidad debe ser mayor que cero.`)
    return {
      ...item,
      orden: i,
      cantidad,
      total: totalItem({ ...item, cantidad }),
      costo_unit: material ? material.costo : 0,
    }
  })
}

// ───────────────────────── Ventas ─────────────────────────

/**
 * Crea una venta con sus ítems (y opcionalmente un primer pago).
 * opciones.registrarStock: descuenta insumos del stock de la sucursal.
 */
export function crearVenta(db, datos, { usuarioId, hoy, registrarStock = true } = {}) {
  const d = validar(datos, {
    cliente_id: { tipo: 'entero', requerido: true, nombre: 'cliente' },
    vendedor_id: { tipo: 'entero', requerido: true, nombre: 'vendedor' },
    sucursal_id: { tipo: 'entero', requerido: true, nombre: 'sucursal' },
    fecha: { tipo: 'fecha', defecto: hoy },
    proforma_id: { tipo: 'entero' },
    descuento_pct: { tipo: 'numero', min: 0, max: 100, defecto: 0 },
    notas: { tipo: 'texto', largo: 1000, defecto: '' },
  })
  if (!db.prepare('SELECT 1 FROM clientes WHERE id = ?').get(d.cliente_id)) throw invalido('El cliente no existe.')
  const items = normalizarItems(db, datos.items)
  const t = calcularTotales(items, d.descuento_pct)
  const costo = r2(items.reduce((s, i) => s + i.costo_unit * i.cantidad, 0))
  const codigo = datos.codigo ?? siguienteCodigo(db, 'ventas', 'VEN', d.fecha.slice(0, 4))

  const info = db
    .prepare(`INSERT INTO ventas (codigo, fecha, cliente_id, vendedor_id, sucursal_id, proforma_id, descuento_pct, subtotal, total, costo, notas)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(codigo, d.fecha, d.cliente_id, d.vendedor_id, d.sucursal_id, d.proforma_id ?? null, t.descuentoPct, t.subtotal, t.total, costo, d.notas ?? '')
  const ventaId = Number(info.lastInsertRowid)
  const ins = db.prepare(`INSERT INTO venta_items (venta_id, orden, tipo, material_id, descripcion, ancho_cm, alto_cm, piezas, cantidad, unidad, precio_unit, costo_unit, total)
                          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  for (const i of items) {
    ins.run(ventaId, i.orden, i.tipo, i.material_id ?? null, i.descripcion, i.ancho_cm ?? null, i.alto_cm ?? null, i.piezas ?? null, i.cantidad, i.unidad, i.precio_unit, i.costo_unit, i.total)
    if (registrarStock && i.tipo === 'insumo' && i.material_id) {
      moverStock(db, { material_id: i.material_id, sucursal_id: d.sucursal_id, cantidad: -i.cantidad, tipo: 'venta', referencia: codigo, fecha: d.fecha, usuarioId })
    }
  }
  if (datos.pago && Number(datos.pago.monto) > 0) registrarPago(db, ventaId, { ...datos.pago, fecha: datos.pago.fecha ?? d.fecha }, usuarioId)
  return ventaId
}

export function registrarPago(db, ventaId, datos, usuarioId) {
  const p = validar(datos, {
    fecha: { tipo: 'fecha', requerido: true },
    monto: { tipo: 'numero', requerido: true, min: 0.01 },
    metodo: { tipo: 'texto', requerido: true, opciones: ['efectivo', 'qr', 'transferencia', 'tarjeta'], nombre: 'método' },
    referencia: { tipo: 'texto', largo: 100, defecto: '' },
  })
  const venta = db.prepare('SELECT total, estado FROM ventas WHERE id = ?').get(ventaId)
  if (!venta) throw new ErrorHttp(404, 'Venta no encontrada.')
  if (venta.estado === 'anulada') throw invalido('La venta está anulada.')
  const pagos = db.prepare('SELECT monto FROM pagos WHERE venta_id = ?').all(ventaId)
  const { saldo } = saldoVenta(venta.total, pagos)
  if (p.monto > saldo + 0.005) throw invalido(`El pago supera el saldo pendiente (Bs ${saldo}).`)
  db.prepare('INSERT INTO pagos (venta_id, fecha, monto, metodo, referencia, usuario_id) VALUES (?,?,?,?,?,?)').run(ventaId, p.fecha, r2(p.monto), p.metodo, p.referencia ?? '', usuarioId ?? null)
}

// ───────────────────────── Stock ─────────────────────────

export function moverStock(db, { material_id, sucursal_id, cantidad, tipo, referencia = '', fecha, usuarioId, costo_unit = 0 }) {
  db.prepare('INSERT INTO existencias (material_id, sucursal_id, cantidad, minimo) VALUES (?, ?, 0, 0) ON CONFLICT DO NOTHING').run(material_id, sucursal_id)
  if (tipo === 'ajuste') {
    // En un ajuste, `cantidad` es el conteo físico real
    const actual = db.prepare('SELECT cantidad FROM existencias WHERE material_id = ? AND sucursal_id = ?').get(material_id, sucursal_id).cantidad
    db.prepare('UPDATE existencias SET cantidad = ? WHERE material_id = ? AND sucursal_id = ?').run(cantidad, material_id, sucursal_id)
    db.prepare('INSERT INTO movimientos (fecha, material_id, sucursal_id, tipo, cantidad, costo_unit, referencia, usuario_id) VALUES (?,?,?,?,?,?,?,?)').run(fecha, material_id, sucursal_id, tipo, r2(cantidad - actual), costo_unit, referencia, usuarioId ?? null)
    return
  }
  db.prepare('UPDATE existencias SET cantidad = cantidad + ? WHERE material_id = ? AND sucursal_id = ?').run(cantidad, material_id, sucursal_id)
  db.prepare('INSERT INTO movimientos (fecha, material_id, sucursal_id, tipo, cantidad, costo_unit, referencia, usuario_id) VALUES (?,?,?,?,?,?,?,?)').run(fecha, material_id, sucursal_id, tipo, cantidad, costo_unit, referencia, usuarioId ?? null)
}

/** En planchas, la existencia = planchas enteras disponibles (sin cortes). */
export function sincronizarExistenciaPlanchas(db, materialId, sucursalId) {
  const n = db.prepare("SELECT COUNT(*) n FROM planchas WHERE material_id = ? AND sucursal_id = ? AND estado = 'disponible'").get(materialId, sucursalId).n
  db.prepare('INSERT INTO existencias (material_id, sucursal_id, cantidad, minimo) VALUES (?, ?, ?, 0) ON CONFLICT(material_id, sucursal_id) DO UPDATE SET cantidad = excluded.cantidad').run(materialId, sucursalId, n)
}

// ───────────────────────── Planchas y cortes ─────────────────────────

export function datosPlancha(db, plancha) {
  const cortes = db.prepare('SELECT id, x, y, w, h, tipo, nota, padre_id FROM plancha_cortes WHERE plancha_id = ? ORDER BY rowid').all(plancha.id)
  return {
    plancha: { id: plancha.id, codigo: plancha.codigo, ancho: plancha.ancho, alto: plancha.alto, material: plancha.material ?? '', espesor: plancha.espesor },
    cortes: cortes.map((c) => {
      const s = { id: c.id, x: c.x, y: c.y, w: c.w, h: c.h, tipo: c.tipo, nota: c.nota }
      if (c.padre_id) s.padreId = c.padre_id
      return s
    }),
  }
}

/**
 * Reemplaza los cortes de una plancha (validando con la misma geometría del front),
 * sincroniza retazos, estado de la plancha, existencias e historial.
 */
export function guardarCortes(db, planchaId, cuerpo, { usuarioId, fecha }) {
  const plancha = db.prepare('SELECT p.*, m.nombre AS material FROM planchas p JOIN materiales m ON m.id = p.material_id WHERE p.id = ?').get(planchaId)
  if (!plancha) throw new ErrorHttp(404, 'Plancha no encontrada.')
  const r = cargarDatos(cuerpo)
  if (!r.ok) throw invalido(r.errores[0], r.errores)
  const { estado } = r
  if (String(estado.plancha.id) !== String(planchaId)) throw invalido('El id de la plancha no coincide con la dirección.')
  if (estado.plancha.ancho !== plancha.ancho || estado.plancha.alto !== plancha.alto) {
    // Se permite corregir el tamaño si los cortes caben (ya validado por cargarDatos)
    db.prepare('UPDATE planchas SET ancho = ?, alto = ? WHERE id = ?').run(estado.plancha.ancho, estado.plancha.alto, planchaId)
  }

  const anteriores = new Map(db.prepare('SELECT * FROM plancha_cortes WHERE plancha_id = ?').all(planchaId).map((c) => [c.id, c]))
  db.prepare('DELETE FROM plancha_cortes WHERE plancha_id = ?').run(planchaId)
  const ins = db.prepare('INSERT INTO plancha_cortes (id, plancha_id, x, y, w, h, tipo, nota, padre_id, usuario_id, fecha) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
  for (const c of estado.cortes) {
    const prev = anteriores.get(c.id)
    const igual = prev && prev.x === c.x && prev.y === c.y && prev.w === c.w && prev.h === c.h && prev.tipo === c.tipo
    ins.run(c.id, planchaId, c.x, c.y, c.w, c.h, c.tipo, c.nota ?? '', c.padreId ?? null, igual ? prev.usuario_id : usuarioId ?? null, igual ? prev.fecha : fecha)
  }

  // Retazos útiles → inventario
  const lista = retazosParaInventario({ ...estado, plancha: { ...estado.plancha, id: planchaId } })
  const vivos = new Set(lista.map((x) => x.id))
  const existentes = db.prepare('SELECT corte_id, estado FROM retazos WHERE plancha_id = ?').all(planchaId)
  for (const ex of existentes) {
    if (!vivos.has(ex.corte_id) && ex.estado !== 'usado') db.prepare('DELETE FROM retazos WHERE plancha_id = ? AND corte_id = ?').run(planchaId, ex.corte_id)
  }
  const upsert = db.prepare(`INSERT INTO retazos (plancha_id, corte_id, material_id, sucursal_id, ancho, alto, m2, libre_m2, estado)
    VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(plancha_id, corte_id) DO UPDATE SET ancho = excluded.ancho, alto = excluded.alto, m2 = excluded.m2, libre_m2 = excluded.libre_m2,
      estado = CASE WHEN retazos.estado = 'usado' THEN 'usado' ELSE excluded.estado END`)
  for (const x of lista) {
    upsert.run(planchaId, x.id, plancha.material_id, plancha.sucursal_id, x.ancho, x.alto, r2(x.m2), r2(x.libreM2), x.recortado ? 'recortado' : 'disponible')
  }

  // Estado de la plancha
  const res = resumenPlancha(estado)
  let nuevoEstado = 'disponible'
  if (estado.cortes.length) nuevoEstado = res.libre.m2 < 0.05 ? 'agotada' : 'en_corte'
  db.prepare('UPDATE planchas SET estado = ? WHERE id = ?').run(nuevoEstado, planchaId)
  sincronizarExistenciaPlanchas(db, plancha.material_id, plancha.sucursal_id)

  const texto = `${estado.cortes.length} cortes · vendido ${r2(res.vendido.m2)} m² · retazo ${r2(res.retazo.m2)} m² · merma ${r2(res.merma.m2)} m²`
  db.prepare('INSERT INTO plancha_historial (plancha_id, usuario_id, fecha, resumen, datos) VALUES (?,?,?,?,?)').run(planchaId, usuarioId ?? null, `${fecha} ${new Date().toISOString().slice(11, 19)}`, texto, JSON.stringify(cuerpo))
  return { estado: nuevoEstado, resumen: res, retazos: lista.length }
}
