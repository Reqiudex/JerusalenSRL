// Consultas de lectura compartidas por reportes, panel, contabilidad y panel del dueño.

/** Ítems vendidos (ventas vigentes) con datos del material. Totales con el descuento de la venta aplicado. */
export function lineasVendidas(db, { desde, hasta, sucursal } = {}) {
  const cond = ["v.estado = 'vigente'"]
  const args = []
  if (desde) { cond.push('v.fecha >= ?'); args.push(desde) }
  if (hasta) { cond.push('v.fecha <= ?'); args.push(hasta) }
  if (sucursal) { cond.push('v.sucursal_id = ?'); args.push(Number(sucursal)) }
  return db.prepare(`
    SELECT v.fecha, v.sucursal_id, v.vendedor_id, i.material_id, i.tipo, i.unidad,
           COALESCE(m.nombre, i.descripcion) AS nombre, m.categoria, m.ancho_cm, m.alto_cm,
           i.cantidad, i.total * (1 - v.descuento_pct / 100.0) AS total, i.costo_unit * i.cantidad AS costo
    FROM venta_items i JOIN ventas v ON v.id = i.venta_id LEFT JOIN materiales m ON m.id = i.material_id
    WHERE ${cond.join(' AND ')}`).all(...args)
}

export function ventasRango(db, { desde, hasta, sucursal } = {}) {
  const cond = []
  const args = []
  if (desde) { cond.push('fecha >= ?'); args.push(desde) }
  if (hasta) { cond.push('fecha <= ?'); args.push(hasta) }
  if (sucursal) { cond.push('sucursal_id = ?'); args.push(Number(sucursal)) }
  return db.prepare(`SELECT id, fecha, sucursal_id, vendedor_id, total, costo, estado FROM ventas ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''}`).all(...args)
}

export function proformasRango(db, { desde, hasta, sucursal } = {}) {
  const cond = []
  const args = []
  if (desde) { cond.push('p.fecha >= ?'); args.push(desde) }
  if (hasta) { cond.push('p.fecha <= ?'); args.push(hasta) }
  if (sucursal) { cond.push('p.sucursal_id = ?'); args.push(Number(sucursal)) }
  return db.prepare(`SELECT p.id, p.vendedor_id, u.nombre AS vendedor, p.estado, p.total, p.fecha FROM proformas p JOIN usuarios u ON u.id = p.vendedor_id
    ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''}`).all(...args)
}

/** Cortes de planchas para reportes de merma (material y cortador). */
export function cortesRango(db, { desde, hasta, sucursal } = {}) {
  const cond = []
  const args = []
  if (desde) { cond.push('c.fecha >= ?'); args.push(desde) }
  if (hasta) { cond.push('c.fecha <= ?'); args.push(hasta) }
  if (sucursal) { cond.push('p.sucursal_id = ?'); args.push(Number(sucursal)) }
  return db.prepare(`
    SELECT c.tipo, c.w, c.h, m.nombre AS material, COALESCE(u.nombre, 'Sin dato') AS cortador,
           EXISTS (SELECT 1 FROM plancha_cortes k WHERE k.plancha_id = c.plancha_id AND k.padre_id = c.id) AS tieneHijos
    FROM plancha_cortes c JOIN planchas p ON p.id = c.plancha_id JOIN materiales m ON m.id = p.material_id
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''}`).all(...args)
}

/** Egresos agrupados por categoría. */
export function egresosPorCategoria(db, { desde, hasta, sucursal } = {}) {
  const cond = ['fecha >= ?', 'fecha <= ?']
  const args = [desde, hasta]
  if (sucursal) { cond.push('sucursal_id = ?'); args.push(Number(sucursal)) }
  return db.prepare(`SELECT categoria, SUM(monto) AS monto, COUNT(*) AS n FROM egresos WHERE ${cond.join(' AND ')} GROUP BY categoria ORDER BY monto DESC`).all(...args)
}

/** Cobrado en el periodo (pagos de ventas vigentes). */
export function cobrado(db, { desde, hasta, sucursal } = {}) {
  const args = [desde, hasta]
  let f = ''
  if (sucursal) {
    f = 'AND v.sucursal_id = ?'
    args.push(Number(sucursal))
  }
  return db.prepare(`SELECT COALESCE(SUM(p.monto),0) AS total FROM pagos p JOIN ventas v ON v.id = p.venta_id WHERE v.estado = 'vigente' AND p.fecha >= ? AND p.fecha <= ? ${f}`).get(...args).total
}

/** Cuentas por cobrar: ventas vigentes con saldo. */
export function porCobrar(db, { sucursal } = {}) {
  const args = []
  let f = ''
  if (sucursal) {
    f = 'AND v.sucursal_id = ?'
    args.push(Number(sucursal))
  }
  return db.prepare(`
    SELECT v.id, v.codigo, v.fecha, v.total, c.nombre AS cliente, c.telefono, u.nombre AS vendedor, s.nombre AS sucursal,
           v.total - COALESCE((SELECT SUM(monto) FROM pagos WHERE venta_id = v.id), 0) AS saldo
    FROM ventas v JOIN clientes c ON c.id = v.cliente_id JOIN usuarios u ON u.id = v.vendedor_id JOIN sucursales s ON s.id = v.sucursal_id
    WHERE v.estado = 'vigente' ${f} AND v.total - COALESCE((SELECT SUM(monto) FROM pagos WHERE venta_id = v.id), 0) > 0.005
    ORDER BY v.fecha`).all(...args)
}

export const ETIQUETAS_EGRESO = {
  compras: 'Compras de material',
  planilla: 'Sueldos',
  alquiler: 'Alquiler',
  servicios: 'Luz, agua e internet',
  transporte: 'Transporte',
  mantenimiento: 'Mantenimiento',
  impuestos: 'Impuestos',
  otros: 'Otros gastos',
}
