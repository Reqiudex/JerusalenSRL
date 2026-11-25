// Proyectos (costos), contabilidad simple y recursos humanos (personal y planilla).
import { Router } from 'express'
import { antiguedad, calcularCostoProyecto, calcularPlanilla, finDeMes, produccionPorProducto, rangoMeses, sumarMeses } from '@jerusalen/reportes'
import { exigir } from '../auth.js'
import { hoy } from '../config.js'
import { leerAjuste } from '../db.js'
import { ETIQUETAS_EGRESO, cobrado, egresosPorCategoria, lineasVendidas, porCobrar } from '../consultas.js'
import { AJUSTES_POR_DEFECTO } from './base.js'
import { aCSV, enviarCSV, invalido, manejar, noEncontrado, r2, registrar, siguienteCodigo, validar } from '../util.js'

export function rutasGestion(db) {
  const r = Router()

  // ───────────── Proyectos y costos ─────────────
  const SQL_PROYECTO = `SELECT pr.*, c.nombre AS cliente, s.nombre AS sucursal, m.nombre AS material, v.codigo AS venta_codigo
    FROM proyectos pr LEFT JOIN clientes c ON c.id = pr.cliente_id JOIN sucursales s ON s.id = pr.sucursal_id
    LEFT JOIN materiales m ON m.id = pr.material_id LEFT JOIN ventas v ON v.id = pr.venta_id`
  const salidaProyecto = (p) => {
    const entrada = JSON.parse(p.entrada)
    return { ...p, entrada, calculo: calcularCostoProyecto(entrada) }
  }
  const reglasProyecto = {
    nombre: { tipo: 'texto', requerido: true, largo: 120 },
    cliente_id: { tipo: 'entero' },
    sucursal_id: { tipo: 'entero', nombre: 'sucursal' },
    material_id: { tipo: 'entero' },
    venta_id: { tipo: 'entero' },
    estado: { tipo: 'texto', opciones: ['cotizado', 'en_produccion', 'colocado', 'cancelado'] },
    fecha: { tipo: 'fecha' },
    fecha_fin: { tipo: 'fecha' },
  }
  const prepararEntrada = (body) => {
    const e = body.entrada ?? {}
    const c = calcularCostoProyecto(e)
    if (!c.ok) throw invalido(c.errores[0], c.errores)
    return { entrada: e, calculo: c }
  }
  r.get('/proyectos', exigir('proyectos'), manejar((req, res) => {
    const cond = []
    const args = []
    if (req.query.estado) { cond.push('pr.estado = ?'); args.push(req.query.estado) }
    if (req.query.sucursal) { cond.push('pr.sucursal_id = ?'); args.push(Number(req.query.sucursal)) }
    res.json(db.prepare(`${SQL_PROYECTO} ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY pr.fecha DESC, pr.id DESC LIMIT 500`).all(...args).map((p) => ({ ...p, entrada: undefined })))
  }))
  r.get('/proyectos/:id', exigir('proyectos'), manejar((req, res) => {
    const p = db.prepare(`${SQL_PROYECTO} WHERE pr.id = ?`).get(req.params.id)
    if (!p) throw noEncontrado('Proyecto')
    res.json(salidaProyecto(p))
  }))
  r.post('/proyectos/calcular', exigir('proyectos'), manejar((req, res) => res.json(calcularCostoProyecto(req.body ?? {}))))
  r.post('/proyectos', exigir('proyectos', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, reglasProyecto)
    const { entrada, calculo } = prepararEntrada(req.body)
    const fecha = d.fecha ?? hoy()
    const info = db.prepare(`INSERT INTO proyectos (codigo, nombre, cliente_id, sucursal_id, material_id, venta_id, estado, fecha, fecha_fin, entrada, m2, costo_total, precio, creado_por)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(siguienteCodigo(db, 'proyectos', 'PRY', fecha.slice(0, 4)), d.nombre, d.cliente_id ?? null, d.sucursal_id ?? req.usuario.sucursal_id ?? 1,
      d.material_id ?? null, d.venta_id ?? null, d.estado ?? 'cotizado', fecha, d.fecha_fin ?? null, JSON.stringify(entrada), calculo.m2, calculo.costoTotal, calculo.precio, req.usuario.id)
    registrar(db, req.usuario.id, 'proyecto creado', d.nombre)
    res.status(201).json(salidaProyecto(db.prepare(`${SQL_PROYECTO} WHERE pr.id = ?`).get(info.lastInsertRowid)))
  }))
  r.put('/proyectos/:id', exigir('proyectos', 'escribir'), manejar((req, res) => {
    const p = db.prepare('SELECT * FROM proyectos WHERE id = ?').get(req.params.id)
    if (!p) throw noEncontrado('Proyecto')
    const d = { ...p, ...validar(req.body, reglasProyecto, { parcial: true }) }
    let { entrada, m2, costo_total: costo, precio } = p
    if (req.body.entrada) {
      const x = prepararEntrada(req.body)
      entrada = JSON.stringify(x.entrada)
      m2 = x.calculo.m2
      costo = x.calculo.costoTotal
      precio = x.calculo.precio
    }
    if (d.estado === 'colocado' && !d.fecha_fin) d.fecha_fin = hoy()
    db.prepare('UPDATE proyectos SET nombre=?, cliente_id=?, sucursal_id=?, material_id=?, venta_id=?, estado=?, fecha=?, fecha_fin=?, entrada=?, m2=?, costo_total=?, precio=? WHERE id=?')
      .run(d.nombre, d.cliente_id, d.sucursal_id, d.material_id, d.venta_id, d.estado, d.fecha, d.fecha_fin, entrada, m2, costo, precio, p.id)
    res.json(salidaProyecto(db.prepare(`${SQL_PROYECTO} WHERE pr.id = ?`).get(p.id)))
  }))

  // Producción por producto: m² vendidos y m² colocados en proyectos
  r.get('/produccion', exigir('proyectos'), manejar((req, res) => {
    const desde = req.query.desde ?? `${hoy().slice(0, 7)}-01`
    const hasta = req.query.hasta ?? hoy()
    const sucursal = req.query.sucursal ? Number(req.query.sucursal) : null
    const vendidos = produccionPorProducto(lineasVendidas(db, { desde, hasta, sucursal }).filter((l) => l.categoria === 'plancha'))
    const colocados = db.prepare(`SELECT m.nombre, SUM(pr.m2) AS m2, COUNT(*) AS proyectos FROM proyectos pr JOIN materiales m ON m.id = pr.material_id
      WHERE pr.estado = 'colocado' AND pr.fecha_fin BETWEEN ? AND ? ${sucursal ? 'AND pr.sucursal_id = ?' : ''} GROUP BY m.nombre ORDER BY m2 DESC`).all(desde, hasta, ...(sucursal ? [sucursal] : []))
    const servicios = db.prepare(`SELECT i.descripcion AS nombre, i.unidad, SUM(i.cantidad) AS cantidad FROM venta_items i JOIN ventas v ON v.id = i.venta_id
      WHERE v.estado='vigente' AND i.tipo = 'servicio' AND v.fecha BETWEEN ? AND ? ${sucursal ? 'AND v.sucursal_id = ?' : ''} GROUP BY i.descripcion, i.unidad ORDER BY cantidad DESC`).all(desde, hasta, ...(sucursal ? [sucursal] : []))
    res.json({ desde, hasta, vendidos, colocados: colocados.map((c) => ({ ...c, m2: r2(c.m2) })), servicios: servicios.map((s) => ({ ...s, cantidad: r2(s.cantidad) })) })
  }))

  // ───────────── Contabilidad ─────────────
  const CATEGORIAS = Object.keys(ETIQUETAS_EGRESO)
  r.get('/egresos', exigir('contabilidad'), manejar((req, res) => {
    const cond = []
    const args = []
    if (req.query.desde) { cond.push('e.fecha >= ?'); args.push(req.query.desde) }
    if (req.query.hasta) { cond.push('e.fecha <= ?'); args.push(req.query.hasta) }
    if (req.query.sucursal) { cond.push('e.sucursal_id = ?'); args.push(Number(req.query.sucursal)) }
    if (req.query.categoria) { cond.push('e.categoria = ?'); args.push(req.query.categoria) }
    res.json(db.prepare(`SELECT e.*, s.nombre AS sucursal FROM egresos e JOIN sucursales s ON s.id = e.sucursal_id ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY e.fecha DESC, e.id DESC LIMIT 1000`).all(...args))
  }))
  r.post('/egresos', exigir('contabilidad', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, {
      fecha: { tipo: 'fecha', requerido: true },
      sucursal_id: { tipo: 'entero', requerido: true, nombre: 'sucursal' },
      categoria: { tipo: 'texto', requerido: true, opciones: CATEGORIAS, nombre: 'categoría' },
      descripcion: { tipo: 'texto', requerido: true, largo: 200, nombre: 'descripción' },
      monto: { tipo: 'numero', requerido: true, min: 0.01 },
      proveedor: { tipo: 'texto', largo: 120, defecto: '' },
    })
    const info = db.prepare('INSERT INTO egresos (fecha, sucursal_id, categoria, descripcion, monto, proveedor, usuario_id) VALUES (?,?,?,?,?,?,?)').run(d.fecha, d.sucursal_id, d.categoria, d.descripcion, r2(d.monto), d.proveedor, req.usuario.id)
    registrar(db, req.usuario.id, 'egreso', `${d.categoria} Bs ${d.monto}`)
    res.status(201).json(db.prepare('SELECT * FROM egresos WHERE id = ?').get(info.lastInsertRowid))
  }))
  r.delete('/egresos/:id', exigir('contabilidad', 'escribir'), manejar((req, res) => {
    const e = db.prepare('SELECT * FROM egresos WHERE id = ?').get(req.params.id)
    if (!e) throw noEncontrado('Egreso')
    if (e.planilla_id) throw invalido('Este egreso viene de una planilla cerrada; no se puede borrar aquí.')
    db.prepare('DELETE FROM egresos WHERE id = ?').run(e.id)
    registrar(db, req.usuario.id, 'egreso borrado', `${e.categoria} Bs ${e.monto}`)
    res.json({ ok: true })
  }))

  /** Resultado por mes (ingresos = ventas del mes; también se muestra lo cobrado). */
  const resultadoMes = (mes, sucursal) => {
    const desde = `${mes}-01`
    const hasta = finDeMes(mes)
    const args = [desde, hasta, ...(sucursal ? [sucursal] : [])]
    const v = db.prepare(`SELECT COALESCE(SUM(total),0) AS total, COALESCE(SUM(costo),0) AS costo, COUNT(*) AS n FROM ventas
      WHERE estado = 'vigente' AND fecha BETWEEN ? AND ? ${sucursal ? 'AND sucursal_id = ?' : ''}`).get(...args)
    const eg = egresosPorCategoria(db, { desde, hasta, sucursal })
    const egresos = eg.reduce((s, e) => s + e.monto, 0)
    return {
      mes,
      ingresos: r2(v.total),
      ventas: v.n,
      costoMercaderia: r2(v.costo),
      cobrado: r2(cobrado(db, { desde, hasta, sucursal })),
      egresos: r2(egresos),
      porCategoria: eg.map((e) => ({ categoria: e.categoria, nombre: ETIQUETAS_EGRESO[e.categoria], monto: r2(e.monto) })),
      resultado: r2(v.total - egresos),
    }
  }
  r.get('/contabilidad/resultado', exigir('contabilidad'), manejar((req, res) => {
    const hasta = req.query.hasta ?? hoy().slice(0, 7)
    const desde = req.query.desde ?? sumarMeses(hasta, -11)
    const sucursal = req.query.sucursal ? Number(req.query.sucursal) : null
    const meses = rangoMeses(desde, hasta).map((m) => resultadoMes(m, sucursal))
    const sucursales = db.prepare('SELECT id, nombre FROM sucursales WHERE activo = 1 ORDER BY id').all()
    const porSucursal = sucursales.map((s) => ({ ...s, ...resultadoMes(hasta, s.id) }))
    const tot = (k) => r2(meses.reduce((s, m) => s + m[k], 0))
    res.json({ meses, porSucursal, totales: { ingresos: tot('ingresos'), egresos: tot('egresos'), resultado: tot('resultado'), cobrado: tot('cobrado') } })
  }))
  r.get('/contabilidad/cobrar', exigir('contabilidad'), manejar((req, res) => {
    const filas = porCobrar(db, { sucursal: req.query.sucursal })
    res.json({ total: r2(filas.reduce((s, f) => s + f.saldo, 0)), filas: filas.map((f) => ({ ...f, saldo: r2(f.saldo) })) })
  }))
  // Libro para el contador: ingresos (ventas), cobros y egresos del periodo
  r.get('/contabilidad/libro.csv', exigir('contabilidad'), manejar((req, res) => {
    const periodo = String(req.query.periodo ?? hoy().slice(0, 7))
    if (!/^\d{4}(-\d{2})?$/.test(periodo)) throw invalido('Periodo inválido (AAAA o AAAA-MM).')
    const ventas = db.prepare(`SELECT v.fecha, 'Venta' AS tipo, v.codigo AS ref, c.nombre AS detalle, s.nombre AS sucursal, v.total AS ingreso, 0 AS egreso
      FROM ventas v JOIN clientes c ON c.id = v.cliente_id JOIN sucursales s ON s.id = v.sucursal_id WHERE v.estado = 'vigente' AND v.fecha LIKE ?`).all(`${periodo}%`)
    const egresos = db.prepare(`SELECT e.fecha, 'Egreso' AS tipo, e.categoria AS ref, e.descripcion || CASE WHEN e.proveedor <> '' THEN ' — ' || e.proveedor ELSE '' END AS detalle, s.nombre AS sucursal, 0 AS ingreso, e.monto AS egreso
      FROM egresos e JOIN sucursales s ON s.id = e.sucursal_id WHERE e.fecha LIKE ?`).all(`${periodo}%`)
    const filas = [...ventas, ...egresos].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
    enviarCSV(res, `libro-${periodo}.csv`, aCSV(filas, [
      { titulo: 'Fecha', valor: (f) => f.fecha }, { titulo: 'Tipo', valor: (f) => f.tipo }, { titulo: 'Referencia', valor: (f) => (f.tipo === 'Egreso' ? ETIQUETAS_EGRESO[f.ref] : f.ref) },
      { titulo: 'Detalle', valor: (f) => f.detalle }, { titulo: 'Sucursal', valor: (f) => f.sucursal },
      { titulo: 'Ingreso (Bs)', valor: (f) => r2(f.ingreso) }, { titulo: 'Egreso (Bs)', valor: (f) => r2(f.egreso) },
    ]))
  }))

  // ───────────── RRHH ─────────────
  const reglasTrabajador = {
    nombre: { tipo: 'texto', requerido: true, largo: 120 },
    cargo: { tipo: 'texto', largo: 80, defecto: '' },
    sucursal_id: { tipo: 'entero', requerido: true, nombre: 'sucursal' },
    fecha_ingreso: { tipo: 'fecha', requerido: true, nombre: 'fecha de ingreso' },
    fecha_salida: { tipo: 'fecha', nombre: 'fecha de salida' },
    sueldo: { tipo: 'numero', requerido: true, min: 0 },
    telefono: { tipo: 'texto', largo: 40, defecto: '' },
    activo: { tipo: 'bool', defecto: 1 },
  }
  const conAntiguedad = (t) => ({ ...t, antiguedad: antiguedad(t.fecha_ingreso, hoy()) })
  r.get('/trabajadores', exigir('rrhh'), manejar((req, res) => {
    const cond = []
    const args = []
    if (req.query.sucursal) { cond.push('t.sucursal_id = ?'); args.push(Number(req.query.sucursal)) }
    if (req.query.activos === '1') cond.push('t.activo = 1')
    res.json(db.prepare(`SELECT t.*, s.nombre AS sucursal FROM trabajadores t JOIN sucursales s ON s.id = t.sucursal_id ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY t.activo DESC, s.id, t.nombre`).all(...args).map(conAntiguedad))
  }))
  r.post('/trabajadores', exigir('rrhh', 'escribir'), manejar((req, res) => {
    const d = validar(req.body, reglasTrabajador)
    const info = db.prepare('INSERT INTO trabajadores (nombre, cargo, sucursal_id, fecha_ingreso, fecha_salida, sueldo, telefono, activo) VALUES (@nombre,@cargo,@sucursal_id,@fecha_ingreso,@fecha_salida,@sueldo,@telefono,@activo)').run({ fecha_salida: null, ...d })
    registrar(db, req.usuario.id, 'trabajador creado', d.nombre)
    res.status(201).json(conAntiguedad(db.prepare('SELECT t.*, s.nombre AS sucursal FROM trabajadores t JOIN sucursales s ON s.id = t.sucursal_id WHERE t.id = ?').get(info.lastInsertRowid)))
  }))
  r.put('/trabajadores/:id', exigir('rrhh', 'escribir'), manejar((req, res) => {
    const t = db.prepare('SELECT * FROM trabajadores WHERE id = ?').get(req.params.id)
    if (!t) throw noEncontrado('Trabajador')
    const d = { ...t, ...validar(req.body, reglasTrabajador, { parcial: true }) }
    if (d.fecha_salida && d.activo) d.activo = d.fecha_salida > hoy() ? 1 : 0
    db.prepare('UPDATE trabajadores SET nombre=@nombre, cargo=@cargo, sucursal_id=@sucursal_id, fecha_ingreso=@fecha_ingreso, fecha_salida=@fecha_salida, sueldo=@sueldo, telefono=@telefono, activo=@activo WHERE id=@id').run(d)
    res.json(conAntiguedad(db.prepare('SELECT t.*, s.nombre AS sucursal FROM trabajadores t JOIN sucursales s ON s.id = t.sucursal_id WHERE t.id = ?').get(t.id)))
  }))

  const configPlanilla = () => leerAjuste(db, 'planilla', AJUSTES_POR_DEFECTO.planilla)
  const planillaDe = (periodo) => {
    const guardada = db.prepare('SELECT * FROM planillas WHERE periodo = ?').get(periodo)
    if (guardada) return { ...JSON.parse(guardada.datos), cerrada: !!guardada.cerrada, guardada: true }
    const trabajadores = db.prepare('SELECT * FROM trabajadores').all()
    return { ...calcularPlanilla(trabajadores, periodo, configPlanilla()), cerrada: false, guardada: false }
  }
  r.get('/planillas', exigir('rrhh'), manejar((req, res) => {
    res.json(db.prepare('SELECT id, periodo, total, cerrada, creado_en FROM planillas ORDER BY periodo DESC').all())
  }))
  r.get('/planillas/:periodo', exigir('rrhh'), manejar((req, res) => {
    const { periodo } = validar(req.params, { periodo: { tipo: 'mes', requerido: true } })
    const p = planillaDe(periodo)
    const nombres = Object.fromEntries(db.prepare('SELECT id, nombre FROM sucursales').all().map((s) => [s.id, s.nombre]))
    res.json({ ...p, config: configPlanilla(), sucursales: nombres })
  }))
  // Cierra la planilla: guarda una foto y registra el egreso «Sueldos» por sucursal
  r.post('/planillas/:periodo/cerrar', exigir('rrhh', 'escribir'), manejar((req, res) => {
    const { periodo } = validar(req.params, { periodo: { tipo: 'mes', requerido: true } })
    if (db.prepare('SELECT cerrada FROM planillas WHERE periodo = ?').get(periodo)?.cerrada) throw invalido('Esa planilla ya está cerrada.')
    if (periodo > hoy().slice(0, 7)) throw invalido('No se puede cerrar una planilla de un mes futuro.')
    const datos = calcularPlanilla(db.prepare('SELECT * FROM trabajadores').all(), periodo, configPlanilla())
    db.transaction(() => {
      db.prepare('INSERT INTO planillas (periodo, datos, total, cerrada) VALUES (?,?,?,1) ON CONFLICT(periodo) DO UPDATE SET datos=excluded.datos, total=excluded.total, cerrada=1').run(periodo, JSON.stringify(datos), datos.totales.total_ganado)
      const pid = db.prepare('SELECT id FROM planillas WHERE periodo = ?').get(periodo).id
      for (const [suc, tot] of Object.entries(datos.porSucursal)) {
        db.prepare("INSERT INTO egresos (fecha, sucursal_id, categoria, descripcion, monto, planilla_id, usuario_id) VALUES (?,?,'planilla',?,?,?,?)").run(finDeMes(periodo), Number(suc), `Planilla ${periodo} (${tot.trabajadores} trabajadores)`, tot.total_ganado, pid, req.usuario.id)
      }
    })()
    registrar(db, req.usuario.id, 'planilla cerrada', periodo)
    res.json(planillaDe(periodo))
  }))
  r.get('/planillas/:periodo/csv', exigir('rrhh'), manejar((req, res) => {
    const { periodo } = validar(req.params, { periodo: { tipo: 'mes', requerido: true } })
    const p = planillaDe(periodo)
    const nombres = Object.fromEntries(db.prepare('SELECT id, nombre FROM sucursales').all().map((s) => [s.id, s.nombre]))
    enviarCSV(res, `planilla-${periodo}.csv`, aCSV(p.lineas, [
      { titulo: 'Nombre', valor: (l) => l.nombre }, { titulo: 'Cargo', valor: (l) => l.cargo }, { titulo: 'Sucursal', valor: (l) => nombres[l.sucursal_id] },
      { titulo: 'Antigüedad', valor: (l) => l.antiguedad }, { titulo: 'Días', valor: (l) => l.dias_trabajados }, { titulo: 'Haber básico', valor: (l) => l.haber_basico },
      { titulo: 'Bono antigüedad', valor: (l) => l.bono_antiguedad }, { titulo: 'Total ganado', valor: (l) => l.total_ganado },
      { titulo: 'Aportes', valor: (l) => l.aportes }, { titulo: 'Líquido pagable', valor: (l) => l.liquido },
    ]))
  }))

  return r
}
