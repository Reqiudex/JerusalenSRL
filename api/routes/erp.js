'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { r2, HOY, calcularCostoProyecto, calcularMatrizCorte, calcularAntiguedad } = require('../compute');
const { exigirRol } = require('../auth');

const router = express.Router();

// Helper para filtrar por sucursal: si el usuario no es administrador ni dueño, ve su sucursal;
// si es admin/dueño, puede pasar ?sucursal_id=1|2|3 o "todas".
function resolverSucursal(req) {
  const q = req.query.sucursal_id || req.body?.sucursal_id;
  if (req.usuario && !['administrador', 'dueno', 'contador', 'rrhh'].includes(req.usuario.rol)) {
    if (q && q !== 'todas' && Number(q) > 0) return Number(q);
    return req.usuario.sucursal_id || null;
  }
  if (!q || q === 'todas' || q === '0') return null;
  return Number(q) || null;
}

function siguienteCodigo(tabla, prefijo, pad = 4) {
  const row = db.prepare(`SELECT codigo FROM ${tabla} WHERE codigo LIKE ? ORDER BY id DESC LIMIT 1`).get(prefijo + '%');
  let n = 1;
  if (row && row.codigo) {
    const m = row.codigo.match(/(\d+)\s*$/);
    if (m) n = parseInt(m[1], 10) + 1;
  }
  return prefijo + String(n).padStart(pad, '0');
}

// =========================================================================
// 1. SUCURSALES Y CLIENTES
// =========================================================================
router.get('/sucursales', (_req, res) => {
  const sucursales = db.prepare('SELECT * FROM sucursales WHERE activo = 1 ORDER BY id').all();
  res.json({ ok: true, sucursales });
});

router.post('/sucursales', exigirRol('administrador', 'rrhh'), (req, res) => {
  const b = req.body || {};
  if (!b.nombre) return res.status(400).json({ ok: false, error: 'Nombre de sucursal requerido.' });
  const codigo = (b.codigo || b.nombre.slice(0, 5)).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (b.id) {
    db.prepare(`
      UPDATE sucursales SET codigo=?, nombre=?, tipo=?, direccion=?, telefono=?, encargado=? WHERE id=?
    `).run(codigo, b.nombre, b.tipo || 'taller', b.direccion || '', b.telefono || '', b.encargado || '', b.id);
    return res.json({ ok: true, id: b.id });
  }
  const info = db.prepare(`
    INSERT INTO sucursales (codigo, nombre, tipo, direccion, telefono, encargado, activo)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(codigo, b.nombre, b.tipo || 'taller', b.direccion || '', b.telefono || '', b.encargado || '');
  res.json({ ok: true, id: info.lastInsertRowid });
});

router.get('/clientes', (_req, res) => {
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY nombre').all();
  res.json({ ok: true, clientes });
});

router.post('/clientes', (req, res) => {
  const b = req.body || {};
  if (!b.nombre) return res.status(400).json({ ok: false, error: 'Nombre del cliente requerido.' });
  const info = db.prepare(`
    INSERT INTO clientes (nombre, tipo, nit_ci, telefono, email, direccion, zona, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.nombre,
    b.tipo || 'particular',
    b.nit_ci || '',
    b.telefono || '',
    b.email || '',
    b.direccion || '',
    b.zona || 'Santa Cruz',
    b.notas || ''
  );
  res.json({ ok: true, id: info.lastInsertRowid });
});

// =========================================================================
// 2. RESUMEN GENERAL / PANEL ERP
// =========================================================================
router.get('/resumen', (req, res) => {
  const sucId = resolverSucursal(req);
  const mes = req.query.mes || HOY().slice(0, 7);
  const filtroSuc = sucId ? `AND sucursal_id = ${Number(sucId)}` : '';

  const ventasMes = db.prepare(`SELECT * FROM ventas WHERE substr(fecha, 1, 7) = ? ${filtroSuc}`).all(mes);
  const proformasMes = db.prepare(`SELECT * FROM proformas WHERE substr(fecha, 1, 7) = ? ${filtroSuc}`).all(mes);
  const materiales = db.prepare(`SELECT * FROM materiales WHERE activo = 1 ${filtroSuc}`).all();
  const retazosDisp = db.prepare(`SELECT * FROM retazos WHERE estado = 'disponible' ${filtroSuc}`).all();
  const cortesMes = db.prepare(`SELECT * FROM planchas_corte WHERE substr(fecha, 1, 7) = ? ${filtroSuc}`).all(mes);
  const movsMes = db.prepare(`SELECT * FROM movimientos_contables WHERE substr(fecha, 1, 7) = ? ${filtroSuc}`).all(mes);

  const totalVentasBs = r2(ventasMes.reduce((s, v) => s + v.total_bs, 0));
  const totalCobradoBs = r2(ventasMes.reduce((s, v) => s + v.pagado_bs, 0));
  const cuentasPorCobrarBs = r2(
    db.prepare(`SELECT COALESCE(SUM(saldo_bs), 0) AS s FROM ventas WHERE saldo_bs > 0 ${filtroSuc}`).get().s
  );

  const ingresosContablesBs = r2(movsMes.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto_bs, 0));
  const egresosContablesBs = r2(movsMes.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto_bs, 0));
  const resultadoMesBs = r2(ingresosContablesBs - egresosContablesBs);

  const convertidas = proformasMes.filter(p => p.estado === 'convertida' || p.estado === 'aceptada').length;
  const tasaConversionPct = proformasMes.length > 0 ? r2((convertidas / proformasMes.length) * 100) : 0;

  const bajoMinimo = materiales.filter(m => m.stock < m.minimo);
  const mermaTotalM2 = r2(cortesMes.reduce((s, c) => s + c.merma_m2, 0));
  const mermaTotalBs = r2(cortesMes.reduce((s, c) => s + c.costo_merma_bs, 0));

  res.json({
    ok: true,
    mes,
    sucursal_id: sucId || 'todas',
    kpis: {
      totalVentasBs,
      totalCobradoBs,
      cuentasPorCobrarBs,
      ingresosContablesBs,
      egresosContablesBs,
      resultadoMesBs,
      proformasCount: proformasMes.length,
      proformasConvertidas: convertidas,
      tasaConversionPct,
      materialesCount: materiales.length,
      bajoMinimoCount: bajoMinimo.length,
      retazosCount: retazosDisp.length,
      retazosM2: r2(retazosDisp.reduce((s, r) => s + r.area_m2, 0)),
      mermaTotalM2,
      mermaTotalBs,
    },
    ultimasVentas: ventasMes.slice(0, 8),
    ultimasProformas: proformasMes.slice(0, 8),
    alertasStock: bajoMinimo.slice(0, 8),
  });
});

// =========================================================================
// 3. PROFORMAS DE VENTA
// =========================================================================
router.get('/proformas', (req, res) => {
  const sucId = resolverSucursal(req);
  const whereSuc = sucId ? `WHERE p.sucursal_id = ${Number(sucId)}` : '';
  const proformas = db.prepare(`
    SELECT p.*, s.nombre AS sucursal_nombre, s.codigo AS sucursal_codigo
    FROM proformas p
    LEFT JOIN sucursales s ON s.id = p.sucursal_id
    ${whereSuc}
    ORDER BY p.fecha DESC, p.id DESC
    LIMIT 150
  `).all();

  const itemsStmt = db.prepare('SELECT * FROM proforma_items WHERE proforma_id = ?');
  const data = proformas.map(p => ({
    ...p,
    items: itemsStmt.all(p.id),
  }));
  res.json({ ok: true, proformas: data });
});

router.post('/proformas', exigirRol('administrador', 'vendedor'), (req, res) => {
  const b = req.body || {};
  const items = Array.isArray(b.items) && b.items.length > 0 ? b.items : [];
  if (items.length === 0) {
    return res.status(400).json({ ok: false, error: 'La proforma debe incluir al menos un ítem.' });
  }

  const codigo = b.codigo || siguienteCodigo('proformas', 'PRF-26-');
  const fecha = b.fecha || HOY();
  const validez_dias = Number(b.validez_dias || 15);
  const venc = new Date(fecha);
  venc.setDate(venc.getDate() + validez_dias);
  const fecha_vencimiento = venc.toISOString().slice(0, 10);

  let subtotal_bs = 0;
  const itemsCalculados = items.map(it => {
    const cantidad = Math.max(0.01, Number(it.cantidad || 1));
    const precio_unit_bs = Number(it.precio_unit_bs || 0);
    const costo_unit_bs = Number(it.costo_unit_bs || precio_unit_bs * 0.58);
    const sub = r2(cantidad * precio_unit_bs);
    subtotal_bs = r2(subtotal_bs + sub);
    return {
      material_id: it.material_id || null,
      tipo_item: it.tipo_item || 'm2',
      descripcion: it.descripcion || 'Material / Servicio de marmolería',
      largo_m: Number(it.largo_m || 1),
      ancho_m: Number(it.ancho_m || 1),
      cantidad,
      precio_unit_bs,
      costo_unit_bs,
      subtotal_bs: sub,
    };
  });

  const descuento_pct = Math.max(0, Math.min(50, Number(b.descuento_pct || 0)));
  const descuento_bs = r2(subtotal_bs * (descuento_pct / 100));
  const total_bs = r2(subtotal_bs - descuento_bs);

  const sucursal_id = Number(b.sucursal_id || req.usuario?.sucursal_id || 1);
  const vendedor_id = b.vendedor_id || req.usuario?.id || 'usr-admin';
  const vendedor_nombre = b.vendedor_nombre || req.usuario?.nombre || 'Nain Torrico';

  const info = db.prepare(`
    INSERT INTO proformas (
      codigo, sucursal_id, cliente_id, cliente_nombre, cliente_nit, cliente_telefono,
      vendedor_id, vendedor_nombre, fecha, validez_dias, fecha_vencimiento, estado,
      subtotal_bs, descuento_pct, descuento_bs, total_bs, notas
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    codigo,
    sucursal_id,
    b.cliente_id || null,
    b.cliente_nombre || 'Cliente Particular',
    b.cliente_nit || '',
    b.cliente_telefono || '',
    vendedor_id,
    vendedor_nombre,
    fecha,
    validez_dias,
    fecha_vencimiento,
    b.estado || 'enviada',
    subtotal_bs,
    descuento_pct,
    descuento_bs,
    total_bs,
    b.notas || ''
  );

  const proforma_id = info.lastInsertRowid;
  const insIt = db.prepare(`
    INSERT INTO proforma_items (
      proforma_id, material_id, tipo_item, descripcion, largo_m, ancho_m, cantidad, precio_unit_bs, costo_unit_bs, subtotal_bs
    ) VALUES (@proforma_id, @material_id, @tipo_item, @descripcion, @largo_m, @ancho_m, @cantidad, @precio_unit_bs, @costo_unit_bs, @subtotal_bs)
  `);
  for (const it of itemsCalculados) {
    insIt.run({ proforma_id, ...it });
  }

  res.json({ ok: true, id: proforma_id, codigo, total_bs });
});

router.post('/proformas/:id/estado', exigirRol('administrador', 'vendedor'), (req, res) => {
  const { estado } = req.body || {};
  if (!['enviada', 'aceptada', 'convertida', 'vencida', 'rechazada'].includes(estado)) {
    return res.status(400).json({ ok: false, error: 'Estado de proforma no válido.' });
  }
  db.prepare('UPDATE proformas SET estado = ? WHERE id = ?').run(estado, req.params.id);
  res.json({ ok: true });
});

// Convertir proforma en venta real + descontar stock + registrar ingreso contable
router.post('/proformas/:id/convertir', exigirRol('administrador', 'vendedor', 'contador'), (req, res) => {
  const p = db.prepare('SELECT * FROM proformas WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'Proforma no encontrada.' });
  if (p.estado === 'convertida' && p.venta_id) {
    return res.status(400).json({ ok: false, error: 'Esta proforma ya fue convertida en venta.' });
  }

  const items = db.prepare('SELECT * FROM proforma_items WHERE proforma_id = ?').all(p.id);
  const b = req.body || {};
  const metodo_pago = b.metodo_pago || 'Efectivo';
  const pagado_bs = b.pagado_bs != null ? r2(Number(b.pagado_bs)) : p.total_bs;
  const saldo_bs = r2(Math.max(0, p.total_bs - pagado_bs));
  const estado_pago = saldo_bs <= 0 ? 'pagado' : pagado_bs > 0 ? 'parcial' : 'credito';
  const fecha = b.fecha || HOY();
  const codigo = siguienteCodigo('ventas', 'VTA-26-');
  const costo_total_bs = r2(items.reduce((s, it) => s + it.cantidad * (it.costo_unit_bs || it.precio_unit_bs * 0.58), 0));

  const tx = db.transaction(() => {
    const vInfo = db.prepare(`
      INSERT INTO ventas (
        codigo, sucursal_id, proforma_id, cliente_id, cliente_nombre, cliente_nit, cliente_telefono,
        vendedor_id, vendedor_nombre, fecha, metodo_pago, total_bs, costo_total_bs, pagado_bs, saldo_bs, estado_pago, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo,
      p.sucursal_id,
      p.id,
      p.cliente_id,
      p.cliente_nombre,
      p.cliente_nit,
      p.cliente_telefono,
      p.vendedor_id,
      p.vendedor_nombre,
      fecha,
      metodo_pago,
      p.total_bs,
      costo_total_bs,
      pagado_bs,
      saldo_bs,
      estado_pago,
      `Convertida desde proforma ${p.codigo}`
    );

    const venta_id = vInfo.lastInsertRowid;

    const insVI = db.prepare(`
      INSERT INTO venta_items (venta_id, material_id, tipo_item, descripcion, cantidad, m2, precio_unit_bs, costo_unit_bs, subtotal_bs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const it of items) {
      insVI.run(
        venta_id,
        it.material_id,
        it.tipo_item,
        it.descripcion,
        it.cantidad,
        it.cantidad,
        it.precio_unit_bs,
        it.costo_unit_bs || r2(it.precio_unit_bs * 0.58),
        it.subtotal_bs
      );
      if (it.material_id) {
        db.prepare('UPDATE materiales SET stock = MAX(0, stock - ?) WHERE id = ?').run(it.cantidad, it.material_id);
      }
    }

    if (pagado_bs > 0) {
      db.prepare(`
        INSERT INTO venta_pagos (venta_id, fecha, metodo_pago, monto_bs, referencia, usuario_nombre)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(venta_id, fecha, metodo_pago, pagado_bs, `CONV-${p.codigo}`, req.usuario?.nombre || p.vendedor_nombre);

      db.prepare(`
        INSERT INTO movimientos_contables (sucursal_id, fecha, tipo, categoria, concepto, metodo_pago, monto_bs, referencia, venta_id, usuario_nombre)
        VALUES (?, ?, 'ingreso', 'Ventas', ?, ?, ?, ?, ?, ?)
      `).run(
        p.sucursal_id,
        fecha,
        `Venta ${codigo} (Proforma ${p.codigo}) · ${p.cliente_nombre}`,
        metodo_pago,
        pagado_bs,
        codigo,
        venta_id,
        req.usuario?.nombre || p.vendedor_nombre
      );
    }

    db.prepare("UPDATE proformas SET estado = 'convertida', venta_id = ? WHERE id = ?").run(venta_id, p.id);
    return { venta_id, codigo };
  });

  const out = tx();
  res.json({ ok: true, ...out });
});

// =========================================================================
// 4. VENTAS Y PAGOS / SALDOS
// =========================================================================
router.get('/ventas', (req, res) => {
  const sucId = resolverSucursal(req);
  const whereSuc = sucId ? `WHERE v.sucursal_id = ${Number(sucId)}` : '';
  const ventas = db.prepare(`
    SELECT v.*, s.nombre AS sucursal_nombre, s.codigo AS sucursal_codigo, p.codigo AS proforma_codigo
    FROM ventas v
    LEFT JOIN sucursales s ON s.id = v.sucursal_id
    LEFT JOIN proformas p ON p.id = v.proforma_id
    ${whereSuc}
    ORDER BY v.fecha DESC, v.id DESC
    LIMIT 150
  `).all();

  const itemsStmt = db.prepare('SELECT * FROM venta_items WHERE venta_id = ?');
  const pagosStmt = db.prepare('SELECT * FROM venta_pagos WHERE venta_id = ? ORDER BY fecha DESC');

  const data = ventas.map(v => ({
    ...v,
    items: itemsStmt.all(v.id),
    pagos: pagosStmt.all(v.id),
  }));
  res.json({ ok: true, ventas: data });
});

router.post('/ventas', exigirRol('administrador', 'vendedor', 'contador'), (req, res) => {
  const b = req.body || {};
  const items = Array.isArray(b.items) && b.items.length > 0 ? b.items : [];
  if (items.length === 0) {
    return res.status(400).json({ ok: false, error: 'La venta debe tener al menos un ítem.' });
  }

  const codigo = siguienteCodigo('ventas', 'VTA-26-');
  const fecha = b.fecha || HOY();
  const sucursal_id = Number(b.sucursal_id || req.usuario?.sucursal_id || 1);
  const metodo_pago = b.metodo_pago || 'Efectivo';

  let total_bs = 0;
  let costo_total_bs = 0;
  const itemsCalc = items.map(it => {
    const cantidad = Math.max(0.01, Number(it.cantidad || 1));
    const precio_unit_bs = Number(it.precio_unit_bs || 0);
    const costo_unit_bs = Number(it.costo_unit_bs || precio_unit_bs * 0.58);
    const subtotal_bs = r2(cantidad * precio_unit_bs);
    total_bs = r2(total_bs + subtotal_bs);
    costo_total_bs = r2(costo_total_bs + cantidad * costo_unit_bs);
    return {
      material_id: it.material_id || null,
      tipo_item: it.tipo_item || 'm2',
      descripcion: it.descripcion || 'Material / Servicio',
      cantidad,
      m2: cantidad,
      precio_unit_bs,
      costo_unit_bs,
      subtotal_bs,
    };
  });

  const pagado_bs = b.pagado_bs != null ? r2(Number(b.pagado_bs)) : total_bs;
  const saldo_bs = r2(Math.max(0, total_bs - pagado_bs));
  const estado_pago = saldo_bs <= 0 ? 'pagado' : pagado_bs > 0 ? 'parcial' : 'credito';
  const vendedor_id = b.vendedor_id || req.usuario?.id || 'usr-admin';
  const vendedor_nombre = b.vendedor_nombre || req.usuario?.nombre || 'Nain Torrico';

  const tx = db.transaction(() => {
    const vInfo = db.prepare(`
      INSERT INTO ventas (
        codigo, sucursal_id, proforma_id, cliente_id, cliente_nombre, cliente_nit, cliente_telefono,
        vendedor_id, vendedor_nombre, fecha, metodo_pago, total_bs, costo_total_bs, pagado_bs, saldo_bs, estado_pago, notas
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo,
      sucursal_id,
      b.cliente_id || null,
      b.cliente_nombre || 'Cliente de Taller / Showroom',
      b.cliente_nit || '',
      b.cliente_telefono || '',
      vendedor_id,
      vendedor_nombre,
      fecha,
      metodo_pago,
      total_bs,
      costo_total_bs,
      pagado_bs,
      saldo_bs,
      estado_pago,
      b.notas || 'Venta directa en mostrador/taller'
    );

    const venta_id = vInfo.lastInsertRowid;
    const insVI = db.prepare(`
      INSERT INTO venta_items (venta_id, material_id, tipo_item, descripcion, cantidad, m2, precio_unit_bs, costo_unit_bs, subtotal_bs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const it of itemsCalc) {
      insVI.run(venta_id, it.material_id, it.tipo_item, it.descripcion, it.cantidad, it.m2, it.precio_unit_bs, it.costo_unit_bs, it.subtotal_bs);
      if (it.material_id) {
        db.prepare('UPDATE materiales SET stock = MAX(0, stock - ?) WHERE id = ?').run(it.cantidad, it.material_id);
      }
    }

    if (pagado_bs > 0) {
      db.prepare(`
        INSERT INTO venta_pagos (venta_id, fecha, metodo_pago, monto_bs, referencia, usuario_nombre)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(venta_id, fecha, metodo_pago, pagado_bs, codigo, vendedor_nombre);

      db.prepare(`
        INSERT INTO movimientos_contables (sucursal_id, fecha, tipo, categoria, concepto, metodo_pago, monto_bs, referencia, venta_id, usuario_nombre)
        VALUES (?, ?, 'ingreso', 'Ventas', ?, ?, ?, ?, ?, ?)
      `).run(
        sucursal_id,
        fecha,
        `Venta Directa ${codigo} · ${b.cliente_nombre || 'Cliente'}`,
        metodo_pago,
        pagado_bs,
        codigo,
        venta_id,
        vendedor_nombre
      );
    }

    return { id: venta_id, codigo, total_bs, saldo_bs };
  });

  res.json({ ok: true, ...tx() });
});

router.post('/ventas/:id/pagos', exigirRol('administrador', 'vendedor', 'contador'), (req, res) => {
  const v = db.prepare('SELECT * FROM ventas WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ ok: false, error: 'Venta no encontrada.' });

  const b = req.body || {};
  const monto = r2(Number(b.monto_bs || 0));
  if (monto <= 0) return res.status(400).json({ ok: false, error: 'Monto de pago inválido.' });

  const metodo_pago = b.metodo_pago || 'Efectivo';
  const fecha = b.fecha || HOY();
  const nuevoPagado = r2(Math.min(v.total_bs, v.pagado_bs + monto));
  const nuevoSaldo = r2(Math.max(0, v.total_bs - nuevoPagado));
  const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : 'parcial';

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO venta_pagos (venta_id, fecha, metodo_pago, monto_bs, referencia, usuario_nombre)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(v.id, fecha, metodo_pago, monto, b.referencia || `ABONO-${v.codigo}`, req.usuario?.nombre || 'Caja');

    db.prepare('UPDATE ventas SET pagado_bs = ?, saldo_bs = ?, estado_pago = ? WHERE id = ?')
      .run(nuevoPagado, nuevoSaldo, nuevoEstado, v.id);

    db.prepare(`
      INSERT INTO movimientos_contables (sucursal_id, fecha, tipo, categoria, concepto, metodo_pago, monto_bs, referencia, venta_id, usuario_nombre)
      VALUES (?, ?, 'ingreso', 'Cobros Crédito', ?, ?, ?, ?, ?, ?)
    `).run(
      v.sucursal_id,
      fecha,
      `Abono saldo ${v.codigo} · ${v.cliente_nombre}`,
      metodo_pago,
      monto,
      v.codigo,
      v.id,
      req.usuario?.nombre || 'Caja'
    );
  });

  tx();
  res.json({ ok: true, pagado_bs: nuevoPagado, saldo_bs: nuevoSaldo, estado_pago: nuevoEstado });
});

// =========================================================================
// 5. PRODUCCIÓN Y COSTOS POR PROYECTO
// =========================================================================
router.post('/produccion/calcular', (req, res) => {
  const resultado = calcularCostoProyecto(req.body || {});
  res.json({ ok: true, calculo: resultado });
});

router.get('/produccion', (req, res) => {
  const sucId = resolverSucursal(req);
  const whereSuc = sucId ? `WHERE p.sucursal_id = ${Number(sucId)}` : '';
  const proyectos = db.prepare(`
    SELECT p.*, s.nombre AS sucursal_nombre
    FROM proyectos_produccion p
    LEFT JOIN sucursales s ON s.id = p.sucursal_id
    ${whereSuc}
    ORDER BY p.fecha DESC, p.id DESC
  `).all();

  // Producción por producto (m2 cortados/colocados por período)
  const porProducto = db.prepare(`
    SELECT
      COALESCE(m.nombre, vi.descripcion) AS producto,
      COALESCE(m.categoria, 'servicio') AS categoria,
      ROUND(SUM(vi.m2), 2) AS m2_totales,
      ROUND(SUM(vi.subtotal_bs), 2) AS facturado_bs,
      COUNT(DISTINCT vi.venta_id) AS operaciones
    FROM venta_items vi
    JOIN ventas v ON v.id = vi.venta_id
    LEFT JOIN materiales m ON m.id = vi.material_id
    WHERE vi.tipo_item != 'corte_colocacion' ${sucId ? `AND v.sucursal_id = ${Number(sucId)}` : ''}
    GROUP BY producto
    ORDER BY m2_totales DESC
    LIMIT 15
  `).all();

  res.json({ ok: true, proyectos, porProducto });
});

router.post('/produccion', exigirRol('administrador', 'cortador', 'vendedor'), (req, res) => {
  const b = req.body || {};
  const calc = calcularCostoProyecto(b);
  const codigo = b.codigo || siguienteCodigo('proyectos_produccion', 'PRY-26-', 3);
  const sucursal_id = Number(b.sucursal_id || req.usuario?.sucursal_id || 1);
  const fecha = b.fecha || HOY();

  const info = db.prepare(`
    INSERT INTO proyectos_produccion (
      codigo, sucursal_id, cliente_id, cliente_nombre, nombre, tipo_trabajo, fecha, estado,
      largo_m, ancho_m, area_m2, material_id, material_nombre, costo_material_m2_bs,
      cola_kg_m2, costo_cola_kg_bs, cemento_kg_m2, costo_cemento_kg_bs, pegamento_kg_m2, costo_pegamento_kg_bs,
      horas_mo, costo_hora_mo_bs, desperdicio_pct, margen_pct,
      costo_piedra_bs, costo_insumos_bs, costo_mo_bs, costo_desperdicio_bs, costo_total_bs, precio_servicio_bs,
      cortador_nombre, notas
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?
    )
  `).run(
    codigo,
    sucursal_id,
    b.cliente_id || null,
    b.cliente_nombre || 'Cliente de Proyecto',
    b.nombre || `Proyecto ${calc.largo_m}m × ${calc.ancho_m}m`,
    b.tipo_trabajo || 'Revestimiento y Colocación',
    fecha,
    b.estado || 'en_taller',
    calc.largo_m,
    calc.ancho_m,
    calc.area_m2,
    b.material_id || null,
    b.material_nombre || 'Piedra Sinterizada / Mármol',
    calc.costo_material_m2_bs,
    calc.cola_kg_m2,
    calc.costo_cola_kg_bs,
    calc.cemento_kg_m2,
    calc.costo_cemento_kg_bs,
    calc.pegamento_kg_m2,
    calc.costo_pegamento_kg_bs,
    calc.horas_mo,
    calc.costo_hora_mo_bs,
    calc.desperdicio_pct,
    calc.margen_pct,
    calc.costo_piedra_bs,
    calc.costo_insumos_bs,
    calc.costo_mo_bs,
    calc.costo_desperdicio_bs,
    calc.costo_total_bs,
    calc.precio_servicio_bs,
    b.cortador_nombre || req.usuario?.nombre || 'Arq. Marco Justiniano',
    b.notas || ''
  );

  res.json({ ok: true, id: info.lastInsertRowid, codigo, calculo: calc });
});

// =========================================================================
// 6. MATRIZ DE CORTE DE PLANCHAS + RETAZOS + MERMAS
// =========================================================================
router.get('/cortes', (req, res) => {
  const sucId = resolverSucursal(req);
  const whereSuc = sucId ? `WHERE c.sucursal_id = ${Number(sucId)}` : '';
  const cortes = db.prepare(`
    SELECT c.*, s.nombre AS sucursal_nombre
    FROM planchas_corte c
    LEFT JOIN sucursales s ON s.id = c.sucursal_id
    ${whereSuc}
    ORDER BY c.fecha DESC, c.id DESC
  `).all().map(c => ({
    ...c,
    rectangulos: JSON.parse(c.rectangulos || '[]'),
  }));

  const retazos = db.prepare(`
    SELECT r.*, s.nombre AS sucursal_nombre
    FROM retazos r
    LEFT JOIN sucursales s ON s.id = r.sucursal_id
    ${sucId ? `WHERE r.sucursal_id = ${Number(sucId)}` : ''}
    ORDER BY r.id DESC
  `).all();

  res.json({ ok: true, cortes, retazos });
});

router.post('/cortes', exigirRol('administrador', 'cortador'), (req, res) => {
  const b = req.body || {};
  const mat = b.material_id ? db.prepare('SELECT * FROM materiales WHERE id = ?').get(b.material_id) : null;
  const costo_m2_bs = Number(b.costo_m2_bs || mat?.costo_bs || 700);
  const calc = calcularMatrizCorte(b.ancho_cm || 300, b.alto_cm || 170, b.rectangulos || [], costo_m2_bs);

  const codigo = b.codigo || siguienteCodigo('planchas_corte', 'PLC-26-', 3);
  const sucursal_id = Number(b.sucursal_id || req.usuario?.sucursal_id || 1);
  const cortador_id = req.usuario?.id || 'usr-cort-1';
  const cortador_nombre = b.cortador_nombre || req.usuario?.nombre || 'Arq. Marco Justiniano';
  const material_nombre = b.material_nombre || mat?.nombre || 'Mármol Blanco Calacatta Gold Brasil';
  const fecha = b.fecha || HOY();

  const tx = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO planchas_corte (
        codigo, sucursal_id, material_id, material_nombre, cortador_id, cortador_nombre, fecha,
        ancho_cm, alto_cm, area_total_m2, usado_m2, retazo_m2, merma_m2, sin_asignar_m2,
        usado_pct, retazo_pct, merma_pct, costo_m2_bs, costo_merma_bs, rectangulos, plancha_padre_id, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo,
      sucursal_id,
      b.material_id || null,
      material_nombre,
      cortador_id,
      cortador_nombre,
      fecha,
      calc.ancho_cm,
      calc.alto_cm,
      calc.area_total_m2,
      calc.usado_m2,
      calc.retazo_m2,
      calc.merma_m2,
      calc.sin_asignar_m2,
      calc.usado_pct,
      calc.retazo_pct,
      calc.merma_pct,
      calc.costo_m2_bs,
      calc.costo_merma_bs,
      JSON.stringify(calc.rectangulos),
      b.retazo_origen_id || null,
      b.notas || ''
    );

    const corteId = info.lastInsertRowid;

    // Si se cortó un retazo previo, marcarlo como reutilizado
    if (b.retazo_origen_id) {
      db.prepare("UPDATE retazos SET estado = 'reutilizado' WHERE id = ?").run(b.retazo_origen_id);
    }

    // Cada rectángulo marcado como 'retazo' pasa al inventario de retazos reutilizables
    const insRet = db.prepare(`
      INSERT INTO retazos (
        codigo, sucursal_id, plancha_corte_id, material_id, material_nombre,
        ancho_cm, alto_cm, area_m2, valor_estimado_bs, estado, ubicacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'disponible', ?)
    `);

    const retazosCreados = [];
    for (const r of calc.rectangulos.filter(x => x.tipo === 'retazo')) {
      const codRet = siguienteCodigo('retazos', 'RET-26-', 3);
      const valor = r2(r.area_m2 * costo_m2_bs * 0.85);
      const rInfo = insRet.run(
        codRet,
        sucursal_id,
        corteId,
        b.material_id || null,
        material_nombre,
        r.w,
        r.h,
        r.area_m2,
        valor,
        'Caballete Retazos Taller'
      );
      retazosCreados.push({ id: rInfo.lastInsertRowid, codigo: codRet, ancho_cm: r.w, alto_cm: r.h, area_m2: r.area_m2 });
    }

    return { id: corteId, codigo, calculo: calc, retazosCreados };
  });

  res.json({ ok: true, ...tx() });
});

// =========================================================================
// 7. INVENTARIO Y LISTA DE QUÉ COMPRAR
// =========================================================================
router.get('/inventario', (req, res) => {
  const sucId = resolverSucursal(req);
  const whereSuc = sucId ? `AND m.sucursal_id = ${Number(sucId)}` : '';

  const materiales = db.prepare(`
    SELECT m.*, s.nombre AS sucursal_nombre, s.codigo AS sucursal_codigo,
      COALESCE((
        SELECT SUM(vi.m2) FROM venta_items vi
        JOIN ventas v ON v.id = vi.venta_id
        WHERE vi.material_id = m.id AND v.fecha >= '2026-09-01'
      ), 0) AS ventas_90d_m2,
      COALESCE((
        SELECT SUM(vi.m2) FROM venta_items vi
        JOIN ventas v ON v.id = vi.venta_id
        WHERE vi.material_id = m.id AND v.fecha >= '2026-11-01'
      ), 0) AS ventas_30d_m2
    FROM materiales m
    LEFT JOIN sucursales s ON s.id = m.sucursal_id
    WHERE m.activo = 1 ${whereSuc}
    ORDER BY m.categoria, m.nombre
  `).all().map(m => {
    const estado = m.stock < m.minimo ? 'bajo' : m.stock < m.minimo * 1.25 ? 'justo' : 'ok';
    const ritmoMensual = r2(Math.max(m.ventas_30d_m2, m.ventas_90d_m2 / 3));
    const tendencia = m.ventas_30d_m2 > (m.ventas_90d_m2 / 3) * 1.15 ? 'en_alza' : 'estable';
    const sugeridoM2 = estado === 'bajo' || tendencia === 'en_alza'
      ? r2(Math.max(0, m.minimo * 1.5 + ritmoMensual - m.stock))
      : 0;
    const areaPlancha = m.largo_cm && m.ancho_cm ? (m.largo_cm * m.ancho_cm) / 10000 : 5.1;
    const planchasSugeridas = sugeridoM2 > 0 ? Math.max(2, Math.ceil(sugeridoM2 / areaPlancha)) : 0;

    return {
      ...m,
      muestra: m.muestra ? JSON.parse(m.muestra) : null,
      stock: r2(m.stock),
      valor_stock_bs: r2(m.stock * m.costo_bs),
      ventas_90d_m2: r2(m.ventas_90d_m2),
      ventas_30d_m2: r2(m.ventas_30d_m2),
      ritmo_mensual_m2: ritmoMensual,
      estado,
      tendencia,
      sugerido_comprar_m2: sugeridoM2,
      planchas_sugeridas: planchasSugeridas,
      inversion_estimada_bs: r2(sugeridoM2 * m.costo_bs),
    };
  });

  const queComprar = materiales
    .filter(m => m.estado === 'bajo' || (m.tendencia === 'en_alza' && m.sugerido_comprar_m2 > 5))
    .sort((a, b) => (a.stock / Math.max(1, a.minimo)) - (b.stock / Math.max(1, b.minimo)));

  const retazos = db.prepare(`
    SELECT r.*, s.nombre AS sucursal_nombre
    FROM retazos r
    LEFT JOIN sucursales s ON s.id = r.sucursal_id
    WHERE r.estado = 'disponible' ${sucId ? `AND r.sucursal_id = ${Number(sucId)}` : ''}
    ORDER BY r.area_m2 DESC
  `).all();

  res.json({ ok: true, materiales, queComprar, retazos });
});

router.post('/inventario', exigirRol('administrador', 'cortador'), (req, res) => {
  const b = req.body || {};
  if (!b.nombre) return res.status(400).json({ ok: false, error: 'Nombre del material requerido.' });
  const codigo = b.codigo || siguienteCodigo('materiales', 'MAT-', 3);
  const sucursal_id = Number(b.sucursal_id || req.usuario?.sucursal_id || 1);
  const costo_bs = Number(b.costo_bs || 450);
  const precio_m2_bs = Number(b.precio_m2_bs || costo_bs * 1.75);
  const largo_cm = Number(b.largo_cm || 300);
  const ancho_cm = Number(b.ancho_cm || 170);
  const area = (largo_cm * ancho_cm) / 10000;
  const stock = Number(b.stock ?? area * Number(b.planchas_stock || 4));

  const info = db.prepare(`
    INSERT INTO materiales (
      codigo, sucursal_id, familia, categoria, nombre, acabado, grosor_mm, largo_cm, ancho_cm,
      unidad, origen, proveedor, costo_bs, precio_m2_bs, precio_plancha_bs, stock, planchas_stock, minimo, muestra, activo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    codigo,
    sucursal_id,
    b.familia || 'plancha',
    b.categoria || 'marmol',
    b.nombre,
    b.acabado || 'Pulido Espejo',
    Number(b.grosor_mm || 20),
    largo_cm,
    ancho_cm,
    b.unidad || 'm2',
    b.origen || 'Espírito Santo, Brasil',
    b.proveedor || 'Mineração Capixaba S.A.',
    costo_bs,
    precio_m2_bs,
    r2(area * precio_m2_bs * 0.94),
    r2(stock),
    Math.round(stock / Math.max(1, area)),
    Number(b.minimo || 15),
    JSON.stringify(b.muestra || { fondo: '#f5f3ef', veta: '#c9a86a', motas: '#9ca3af' })
  );

  res.json({ ok: true, id: info.lastInsertRowid, codigo });
});

router.post('/inventario/:id/entrada', exigirRol('administrador', 'cortador', 'contador'), (req, res) => {
  const m = db.prepare('SELECT * FROM materiales WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Material no encontrado.' });
  const cantidad = Number(req.body?.cantidad || 0);
  if (cantidad <= 0) return res.status(400).json({ ok: false, error: 'Cantidad inválida.' });
  const area = m.largo_cm && m.ancho_cm ? (m.largo_cm * m.ancho_cm) / 10000 : 5.1;
  const planchasAdd = Math.max(1, Math.round(cantidad / area));
  db.prepare('UPDATE materiales SET stock = stock + ?, planchas_stock = planchas_stock + ? WHERE id = ?')
    .run(r2(cantidad), planchasAdd, m.id);
  res.json({ ok: true });
});

// =========================================================================
// 8. CONTABILIDAD SIMPLE
// =========================================================================
router.get('/contabilidad', (req, res) => {
  const sucId = resolverSucursal(req);
  const mes = req.query.mes || HOY().slice(0, 7);
  const whereSuc = sucId ? `AND m.sucursal_id = ${Number(sucId)}` : '';

  const movimientos = db.prepare(`
    SELECT m.*, s.nombre AS sucursal_nombre, s.codigo AS sucursal_codigo
    FROM movimientos_contables m
    LEFT JOIN sucursales s ON s.id = m.sucursal_id
    WHERE substr(m.fecha, 1, 7) = ? ${whereSuc}
    ORDER BY m.fecha DESC, m.id DESC
  `).all(mes);

  const ingresos_bs = r2(movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto_bs, 0));
  const egresos_bs = r2(movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto_bs, 0));
  const resultado_bs = r2(ingresos_bs - egresos_bs);

  // Por categoría
  const porCategoriaMap = {};
  for (const m of movimientos) {
    const k = `${m.tipo}:${m.categoria}`;
    if (!porCategoriaMap[k]) porCategoriaMap[k] = { tipo: m.tipo, categoria: m.categoria, total_bs: 0, cantidad: 0 };
    porCategoriaMap[k].total_bs = r2(porCategoriaMap[k].total_bs + m.monto_bs);
    porCategoriaMap[k].cantidad++;
  }

  // Resultado mensual por sucursal
  const porSucursal = db.prepare(`
    SELECT
      s.id, s.nombre, s.codigo,
      ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto_bs ELSE 0 END), 0), 2) AS ingresos_bs,
      ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'egreso' THEN m.monto_bs ELSE 0 END), 0), 2) AS egresos_bs
    FROM sucursales s
    LEFT JOIN movimientos_contables m ON m.sucursal_id = s.id AND substr(m.fecha, 1, 7) = ?
    GROUP BY s.id
    ORDER BY s.id
  `).all(mes).map(r => ({
    ...r,
    resultado_bs: r2(r.ingresos_bs - r.egresos_bs),
  }));

  // Cuentas por cobrar
  const cuentasPorCobrar = db.prepare(`
    SELECT v.*, s.nombre AS sucursal_nombre
    FROM ventas v
    LEFT JOIN sucursales s ON s.id = v.sucursal_id
    WHERE v.saldo_bs > 0 ${sucId ? `AND v.sucursal_id = ${Number(sucId)}` : ''}
    ORDER BY v.saldo_bs DESC
  `).all();

  res.json({
    ok: true,
    mes,
    resumen: {
      ingresos_bs,
      egresos_bs,
      resultado_bs,
      total_por_cobrar_bs: r2(cuentasPorCobrar.reduce((s, c) => s + c.saldo_bs, 0)),
    },
    porCategoria: Object.values(porCategoriaMap),
    porSucursal,
    cuentasPorCobrar,
    movimientos,
  });
});

router.post('/contabilidad', exigirRol('administrador', 'contador'), (req, res) => {
  const b = req.body || {};
  const monto = r2(Number(b.monto_bs || 0));
  if (monto <= 0 || !b.concepto) {
    return res.status(400).json({ ok: false, error: 'Concepto y monto válido requeridos.' });
  }
  const info = db.prepare(`
    INSERT INTO movimientos_contables (sucursal_id, fecha, tipo, categoria, concepto, metodo_pago, monto_bs, referencia, usuario_nombre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(b.sucursal_id || req.usuario?.sucursal_id || 1),
    b.fecha || HOY(),
    b.tipo === 'ingreso' ? 'ingreso' : 'egreso',
    b.categoria || 'Gastos Operativos',
    b.concepto,
    b.metodo_pago || 'Efectivo',
    monto,
    b.referencia || '',
    req.usuario?.nombre || 'Contabilidad'
  );
  res.json({ ok: true, id: info.lastInsertRowid });
});

// =========================================================================
// 9. RECURSOS HUMANOS Y PLANILLA MENSUAL
// =========================================================================
router.get('/rrhh', (req, res) => {
  const sucId = resolverSucursal(req);
  const periodo = req.query.periodo || HOY().slice(0, 7);
  const whereSuc = sucId ? `AND t.sucursal_id = ${Number(sucId)}` : '';

  const trabajadores = db.prepare(`
    SELECT t.*, s.nombre AS sucursal_nombre, s.codigo AS sucursal_codigo
    FROM trabajadores t
    LEFT JOIN sucursales s ON s.id = t.sucursal_id
    WHERE t.activo = 1 ${whereSuc}
    ORDER BY t.sucursal_id, t.nombre
  `).all().map(t => {
    const ant = calcularAntiguedad(t.fecha_ingreso);
    const bono_antiguedad_bs = r2(t.sueldo_bs * (ant.pct_bono / 100) * 0.35);
    const total_ganado_bs = r2(t.sueldo_bs + bono_antiguedad_bs + (t.bono_bs || 0));
    return {
      ...t,
      antiguedad: ant,
      bono_antiguedad_bs,
      total_ganado_bs,
    };
  });

  const totalGeneralBs = r2(trabajadores.reduce((s, t) => s + t.total_ganado_bs, 0));

  // Resumen por sucursal
  const sucursales = db.prepare('SELECT * FROM sucursales WHERE activo = 1 ORDER BY id').all();
  const planillaPorSucursal = sucursales.map(s => {
    const personal = trabajadores.filter(t => t.sucursal_id === s.id);
    return {
      sucursal_id: s.id,
      sucursal_nombre: s.nombre,
      sucursal_codigo: s.codigo,
      trabajadores_count: personal.length,
      sueldo_base_total_bs: r2(personal.reduce((a, t) => a + t.sueldo_bs, 0)),
      bonos_total_bs: r2(personal.reduce((a, t) => a + t.bono_antiguedad_bs + (t.bono_bs || 0), 0)),
      liquido_total_bs: r2(personal.reduce((a, t) => a + t.total_ganado_bs, 0)),
    };
  });

  res.json({
    ok: true,
    periodo,
    totalTrabajadores: trabajadores.length,
    totalGeneralBs,
    planillaPorSucursal,
    trabajadores,
  });
});

router.post('/rrhh/trabajadores', exigirRol('administrador', 'rrhh'), (req, res) => {
  const b = req.body || {};
  if (!b.nombre || !b.cargo) {
    return res.status(400).json({ ok: false, error: 'Nombre y cargo del trabajador son obligatorios.' });
  }
  const sueldo_bs = Number(b.sueldo_bs || 2500);
  const info = db.prepare(`
    INSERT INTO trabajadores (sucursal_id, nombre, ci, cargo, seccion, fecha_ingreso, sueldo_bs, bono_bs, coste_hora_bs, telefono, activo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    Number(b.sucursal_id || 1),
    b.nombre,
    b.ci || '',
    b.cargo,
    b.seccion || 'taller',
    b.fecha_ingreso || HOY(),
    sueldo_bs,
    Number(b.bono_bs || 150),
    r2(sueldo_bs / 200),
    b.telefono || ''
  );
  res.json({ ok: true, id: info.lastInsertRowid });
});

// =========================================================================
// 10. REPORTES, GRÁFICAS Y TENDENCIAS
// =========================================================================
router.get('/reportes', (req, res) => {
  const sucId = resolverSucursal(req);
  const filtroV = sucId ? `AND v.sucursal_id = ${Number(sucId)}` : '';
  const filtroP = sucId ? `AND p.sucursal_id = ${Number(sucId)}` : '';
  const filtroC = sucId ? `AND c.sucursal_id = ${Number(sucId)}` : '';

  // 1. Ventas por mes (últimos 12 meses)
  const ventasPorMes = db.prepare(`
    SELECT
      substr(v.fecha, 1, 7) AS mes,
      COUNT(*) AS operaciones,
      ROUND(SUM(v.total_bs), 2) AS total_bs,
      ROUND(SUM(v.total_bs - v.costo_total_bs), 2) AS margen_bs
    FROM ventas v
    WHERE 1=1 ${filtroV}
    GROUP BY mes
    ORDER BY mes ASC
  `).all();

  // 2. Ventas por día de la semana (estacionalidad semanal)
  const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const ventasDiaRaw = db.prepare(`
    SELECT
      CAST(strftime('%w', v.fecha) AS INTEGER) AS dow,
      COUNT(*) AS operaciones,
      ROUND(SUM(v.total_bs), 2) AS total_bs
    FROM ventas v
    WHERE 1=1 ${filtroV}
    GROUP BY dow
    ORDER BY dow
  `).all();
  const ventasPorDiaSemana = [1, 2, 3, 4, 5, 6, 0].map(d => {
    const found = ventasDiaRaw.find(x => x.dow === d);
    return {
      dia: diasNombres[d],
      operaciones: found ? found.operaciones : 0,
      total_bs: found ? found.total_bs : 0,
    };
  });

  // 3. Productos más y menos vendidos + tendencias/modas nuevas (últimos 60 días vs promedio anterior)
  const productosRanking = db.prepare(`
    SELECT
      m.id, m.codigo, m.nombre, m.categoria, m.stock, m.minimo, m.costo_bs, m.precio_m2_bs,
      ROUND(COALESCE(SUM(vi.m2), 0), 2) AS m2_vendidos,
      ROUND(COALESCE(SUM(vi.subtotal_bs), 0), 2) AS facturado_bs,
      ROUND(COALESCE(SUM(CASE WHEN v.fecha >= '2026-10-01' THEN vi.m2 ELSE 0 END), 0), 2) AS m2_reciente_60d,
      ROUND(COALESCE(SUM(CASE WHEN v.fecha < '2026-10-01' THEN vi.m2 ELSE 0 END), 0), 2) AS m2_anterior_10m
    FROM materiales m
    LEFT JOIN venta_items vi ON vi.material_id = m.id
    LEFT JOIN ventas v ON v.id = vi.venta_id ${sucId ? `AND v.sucursal_id = ${Number(sucId)}` : ''}
    WHERE m.familia = 'plancha'
    GROUP BY m.id
    ORDER BY facturado_bs DESC
  `).all().map(p => {
    const promMensualAnterior = p.m2_anterior_10m / 10;
    const promMensualReciente = p.m2_reciente_60d / 2;
    const crecimientoPct = promMensualAnterior > 0
      ? r2(((promMensualReciente - promMensualAnterior) / promMensualAnterior) * 100)
      : promMensualReciente > 0 ? 100 : 0;
    const recomendarComprarM2 = r2(Math.max(0, promMensualReciente * 2.5 + p.minimo - p.stock));
    return {
      ...p,
      prom_mensual_reciente_m2: r2(promMensualReciente),
      crecimiento_pct: crecimientoPct,
      es_moda_nueva: crecimientoPct >= 35 && promMensualReciente >= 6,
      recomendar_comprar_m2: recomendarComprarM2,
    };
  });

  const masVendidos = productosRanking.slice(0, 8);
  const menosVendidos = [...productosRanking].sort((a, b) => a.facturado_bs - b.facturado_bs).slice(0, 6);
  const modasTendencias = [...productosRanking].sort((a, b) => b.crecimiento_pct - a.crecimiento_pct).slice(0, 6);

  // 4. Proformas por empleado y tasa de conversión a ventas
  const conversionPorVendedor = db.prepare(`
    SELECT
      p.vendedor_nombre AS vendedor,
      COUNT(*) AS total_proformas,
      SUM(CASE WHEN p.estado IN ('convertida', 'aceptada') THEN 1 ELSE 0 END) AS convertidas,
      SUM(CASE WHEN p.estado = 'enviada' THEN 1 ELSE 0 END) AS pendientes,
      SUM(CASE WHEN p.estado IN ('vencida', 'rechazada') THEN 1 ELSE 0 END) AS perdidas,
      ROUND(SUM(p.total_bs), 2) AS monto_cotizado_bs,
      ROUND(SUM(CASE WHEN p.estado IN ('convertida', 'aceptada') THEN p.total_bs ELSE 0 END), 2) AS monto_convertido_bs
    FROM proformas p
    WHERE 1=1 ${filtroP}
    GROUP BY p.vendedor_nombre
    ORDER BY monto_convertido_bs DESC
  `).all().map(v => ({
    ...v,
    tasa_conversion_pct: v.total_proformas > 0 ? r2((v.convertidas / v.total_proformas) * 100) : 0,
  }));

  // 5. Mermas por material y por cortador
  const mermasPorMaterial = db.prepare(`
    SELECT
      c.material_nombre AS material,
      COUNT(*) AS planchas_cortadas,
      ROUND(SUM(c.area_total_m2), 2) AS area_total_m2,
      ROUND(SUM(c.usado_m2), 2) AS usado_m2,
      ROUND(SUM(c.retazo_m2), 2) AS retazo_m2,
      ROUND(SUM(c.merma_m2), 2) AS merma_m2,
      ROUND(AVG(c.merma_pct), 2) AS merma_pct_promedio,
      ROUND(SUM(c.costo_merma_bs), 2) AS costo_merma_bs
    FROM planchas_corte c
    WHERE 1=1 ${filtroC}
    GROUP BY c.material_nombre
    ORDER BY merma_m2 DESC
  `).all();

  const mermasPorCortador = db.prepare(`
    SELECT
      c.cortador_nombre AS cortador,
      COUNT(*) AS planchas_cortadas,
      ROUND(SUM(c.usado_m2), 2) AS usado_m2,
      ROUND(SUM(c.retazo_m2), 2) AS retazo_m2,
      ROUND(SUM(c.merma_m2), 2) AS merma_m2,
      ROUND(AVG(c.merma_pct), 2) AS merma_pct_promedio,
      ROUND(SUM(c.costo_merma_bs), 2) AS costo_merma_bs
    FROM planchas_corte c
    WHERE 1=1 ${filtroC}
    GROUP BY c.cortador_nombre
    ORDER BY merma_pct_promedio ASC
  `).all();

  res.json({
    ok: true,
    ventasPorMes,
    ventasPorDiaSemana,
    productoMasExitoso: masVendidos[0] || null,
    productoMenosExitoso: menosVendidos[0] || null,
    masVendidos,
    menosVendidos,
    modasTendencias,
    conversionPorVendedor,
    mermasPorMaterial,
    mermasPorCortador,
  });
});

// =========================================================================
// 11. ENDPOINT DEDICADO PANEL DEL DUEÑO (adminj — Don Emiliano Acero)
// =========================================================================
router.get('/dueno', (req, res) => {
  const mes = req.query.mes || HOY().slice(0, 7);
  const sucId = req.query.sucursal_id && req.query.sucursal_id !== 'todas' ? Number(req.query.sucursal_id) : null;
  const filtroSuc = sucId ? `AND sucursal_id = ${sucId}` : '';

  const movs = db.prepare(`
    SELECT * FROM movimientos_contables
    WHERE substr(fecha, 1, 7) = ? ${filtroSuc}
  `).all(mes);

  const loQueGaneBs = r2(movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto_bs, 0));
  const loQueGasteBs = r2(movs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto_bs, 0));
  const loQueMeQuedaBs = r2(loQueGaneBs - loQueGasteBs);

  // Producción de cada producto (barras simples)
  const produccionProductos = db.prepare(`
    SELECT
      COALESCE(m.nombre, vi.descripcion) AS nombre,
      ROUND(SUM(vi.m2), 2) AS m2,
      ROUND(SUM(vi.subtotal_bs), 2) AS total_bs
    FROM venta_items vi
    JOIN ventas v ON v.id = vi.venta_id
    LEFT JOIN materiales m ON m.id = vi.material_id
    WHERE substr(v.fecha, 1, 7) = ? AND vi.tipo_item != 'corte_colocacion' ${sucId ? `AND v.sucursal_id = ${sucId}` : ''}
    GROUP BY nombre
    ORDER BY m2 DESC
    LIMIT 6
  `).all();

  // Mermas
  const cortes = db.prepare(`
    SELECT * FROM planchas_corte WHERE 1=1 ${filtroSuc}
  `).all();
  const mermasResumen = {
    planchas_cortadas: cortes.length,
    usado_m2: r2(cortes.reduce((s, c) => s + c.usado_m2, 0)),
    retazo_util_m2: r2(cortes.reduce((s, c) => s + c.retazo_m2, 0)),
    merma_m2: r2(cortes.reduce((s, c) => s + c.merma_m2, 0)),
    costo_merma_bs: r2(cortes.reduce((s, c) => s + c.costo_merma_bs, 0)),
  };

  // Qué tengo que comprar
  const queComprar = db.prepare(`
    SELECT id, codigo, nombre, categoria, stock, minimo, costo_bs, proveedor
    FROM materiales
    WHERE activo = 1 AND familia = 'plancha' AND stock < minimo ${filtroSuc}
    ORDER BY (stock / MAX(1, minimo)) ASC
    LIMIT 6
  `).all().map(m => ({
    ...m,
    faltante_m2: r2(Math.max(5, m.minimo * 1.4 - m.stock)),
    planchas_comprar: Math.max(2, Math.ceil((m.minimo * 1.4 - m.stock) / 5.1)),
  }));

  // Cómo van mis vendedores (proformas -> ventas)
  const vendedores = db.prepare(`
    SELECT
      vendedor_nombre AS nombre,
      COUNT(*) AS proformas,
      SUM(CASE WHEN estado IN ('convertida', 'aceptada') THEN 1 ELSE 0 END) AS ventas,
      ROUND(SUM(CASE WHEN estado IN ('convertida', 'aceptada') THEN total_bs ELSE 0 END), 2) AS vendido_bs
    FROM proformas
    WHERE substr(fecha, 1, 7) = ? ${filtroSuc}
    GROUP BY vendedor_nombre
    ORDER BY vendido_bs DESC
  `).all().map(v => ({
    ...v,
    conversion_pct: v.proformas > 0 ? Math.round((v.ventas / v.proformas) * 100) : 0,
  }));

  const sucursales = db.prepare('SELECT id, codigo, nombre FROM sucursales WHERE activo = 1 ORDER BY id').all();

  res.json({
    ok: true,
    mes,
    sucursal_id: sucId || 'todas',
    sucursales,
    tarjetas: {
      loQueGaneBs,
      loQueGasteBs,
      loQueMeQuedaBs,
    },
    produccionProductos,
    mermasResumen,
    queComprar,
    vendedores,
  });
});

// =========================================================================
// 12. USUARIOS Y AJUSTES (Solo Administrador)
// =========================================================================
router.get('/usuarios', exigirRol('administrador'), (_req, res) => {
  const usuarios = db.prepare(`
    SELECT u.id, u.email, u.nombre, u.telefono, u.rol, u.rol_nombre, u.sucursal_id, u.pin, u.activo, s.nombre AS sucursal_nombre
    FROM usuarios u
    LEFT JOIN sucursales s ON s.id = u.sucursal_id
    ORDER BY u.nombre
  `).all();
  const empresaRow = db.prepare("SELECT valor FROM ajustes WHERE clave = 'empresa'").get();
  const empresa = empresaRow ? JSON.parse(empresaRow.valor) : {};
  res.json({ ok: true, usuarios, empresa });
});

router.post('/usuarios', exigirRol('administrador'), (req, res) => {
  const b = req.body || {};
  if (!b.email || !b.nombre || !b.rol) {
    return res.status(400).json({ ok: false, error: 'Nombre, correo y rol son obligatorios.' });
  }
  const rolesNombres = {
    dueno: 'Dueño Fundador',
    administrador: 'Administrador General',
    vendedor: 'Vendedor Comercial',
    cortador: 'Maestro Cortador / Arquitecto',
    contador: 'Contabilidad',
    rrhh: 'Recursos Humanos',
  };
  const hash = bcrypt.hashSync(b.password || 'jerusalen2026', 10);
  const id = b.id || `usr-${Date.now()}`;

  db.prepare(`
    INSERT OR REPLACE INTO usuarios (id, email, nombre, telefono, rol, rol_nombre, sucursal_id, pin, activo, permisos, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, '["*"]', ?)
  `).run(
    id,
    b.email.trim(),
    b.nombre.trim(),
    b.telefono || '',
    b.rol,
    rolesNombres[b.rol] || b.rol,
    b.sucursal_id ? Number(b.sucursal_id) : null,
    b.pin || null,
    hash
  );
  res.json({ ok: true, id });
});

router.post('/reset-demo', exigirRol('administrador'), (_req, res) => {
  const seed = require('../seed');
  seed(true);
  res.json({ ok: true, message: 'Datos de demostración reiniciados correctamente.' });
});

module.exports = router;
