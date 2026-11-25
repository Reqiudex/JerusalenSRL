// Reportes y gráficas, panel de inicio del ERP y resumen del panel del dueño.
import { Router } from 'express'
import {
  calcularPlanilla, conversionPorVendedor, finDeMes, indiceEstacional, mermasPor, productoMasYMenosExitoso, produccionPorProducto,
  rankingProductos, sumarDias, sumarMeses, tendencias, variacionPct, ventasPorDiaSemana, ventasPorMes,
} from '@jerusalen/reportes'
import { exigir } from '../auth.js'
import { hoy } from '../config.js'
import { ETIQUETAS_EGRESO, cobrado, cortesRango, egresosPorCategoria, lineasVendidas, porCobrar, proformasRango, ventasRango } from '../consultas.js'
import { listaCompras } from './inventario.js'
import { leerAjuste } from '../db.js'
import { AJUSTES_POR_DEFECTO } from './base.js'
import { marcarVencidas } from './comercial.js'
import { invalido, manejar, r2 } from '../util.js'

export function rutasReportes(db) {
  const r = Router()
  const catalogo = () => db.prepare("SELECT id, nombre, unidad, activo FROM materiales WHERE categoria = 'plancha'").all()

  // ── Reportes completos ──
  r.get('/reportes', exigir('reportes'), manejar((req, res) => {
    const fecha = hoy()
    const hasta = req.query.hasta ?? fecha
    const desde = req.query.desde ?? sumarDias(hasta, -364)
    if (desde > hasta) throw invalido('La fecha «desde» es posterior a «hasta».')
    const sucursal = req.query.sucursal ? Number(req.query.sucursal) : null
    marcarVencidas(db)

    const lineas = lineasVendidas(db, { desde, hasta, sucursal })
    const lineasPlanchas = lineas.filter((l) => l.categoria === 'plancha')
    const ventas = ventasRango(db, { desde, hasta, sucursal })
    const porMes = ventasPorMes(ventas, { desde: desde.slice(0, 7), hasta: hasta.slice(0, 7) })
    // Tendencias siempre con 12 meses de historia hasta «hasta»
    const lineasAnio = lineasVendidas(db, { desde: sumarDias(hasta, -365), hasta, sucursal }).filter((l) => l.categoria === 'plancha')
    const tend = tendencias(lineasAnio, { hoy: hasta })
    const cortes = cortesRango(db, { desde, hasta, sucursal })

    res.json({
      desde,
      hasta,
      productos: rankingProductos(lineasPlanchas, { catalogo: catalogo(), por: req.query.por === 'cantidad' ? 'cantidad' : 'total', limite: 8 }),
      exito: (() => {
        const x = productoMasYMenosExitoso(lineasPlanchas, catalogo())
        return { masExitoso: x.masExitoso, menosExitoso: x.menosExitoso }
      })(),
      porMes,
      estacionalidad: indiceEstacional(porMes),
      porDiaSemana: ventasPorDiaSemana(ventas),
      tendencias: tend,
      compras: listaCompras(db, { sucursal, fecha: hasta }).slice(0, 25),
      vendedores: conversionPorVendedor(proformasRango(db, { desde, hasta, sucursal })),
      mermas: { porMaterial: mermasPor(cortes, 'material'), porCortador: mermasPor(cortes, 'cortador') },
      produccion: produccionPorProducto(lineasPlanchas),
    })
  }))

  // ── Panel de inicio del ERP ──
  r.get('/panel', exigir('panel'), manejar((req, res) => {
    const fecha = hoy()
    const mes = fecha.slice(0, 7)
    const ini = `${mes}-01`
    const mesAnt = sumarMeses(mes, -1)
    const sucursal = req.query.sucursal ? Number(req.query.sucursal) : null
    marcarVencidas(db)
    const ventasMes = ventasRango(db, { desde: ini, hasta: fecha, sucursal }).filter((v) => v.estado === 'vigente')
    // Mismo tramo de días del mes anterior, para comparar justo
    const finAnt = sumarDias(`${mesAnt}-01`, Number(fecha.slice(8, 10)) - 1)
    const ventasAnt = ventasRango(db, { desde: `${mesAnt}-01`, hasta: finAnt > finDeMes(mesAnt) ? finDeMes(mesAnt) : finAnt, sucursal }).filter((v) => v.estado === 'vigente')
    const total = (vs) => r2(vs.reduce((s, v) => s + v.total, 0))
    const prof = proformasRango(db, { sucursal })
    const abiertas = prof.filter((p) => ['enviada', 'aceptada'].includes(p.estado))
    const pc = porCobrar(db, { sucursal })
    const compras = listaCompras(db, { sucursal, fecha })
    const ultimas = db.prepare(`SELECT v.id, v.codigo, v.fecha, v.total, c.nombre AS cliente, u.nombre AS vendedor FROM ventas v JOIN clientes c ON c.id = v.cliente_id JOIN usuarios u ON u.id = v.vendedor_id
      WHERE v.estado = 'vigente' ${sucursal ? 'AND v.sucursal_id = ?' : ''} ORDER BY v.fecha DESC, v.id DESC LIMIT 6`).all(...(sucursal ? [sucursal] : []))
    const porVencer = db.prepare(`SELECT p.id, p.codigo, p.fecha, p.validez_dias, p.total, c.nombre AS cliente, c.telefono, u.nombre AS vendedor FROM proformas p JOIN clientes c ON c.id = p.cliente_id JOIN usuarios u ON u.id = p.vendedor_id
      WHERE p.estado IN ('enviada','aceptada') ${sucursal ? 'AND p.sucursal_id = ?' : ''} ORDER BY date(p.fecha, '+' || p.validez_dias || ' days') LIMIT 6`).all(...(sucursal ? [sucursal] : []))
    const porMes = ventasPorMes(ventasRango(db, { desde: `${sumarMeses(mes, -11)}-01`, hasta: fecha, sucursal }), { desde: sumarMeses(mes, -11), hasta: mes })
    res.json({
      fecha,
      kpis: {
        ventasMes: total(ventasMes),
        ventasMesN: ventasMes.length,
        variacionPct: variacionPct(total(ventasMes), total(ventasAnt)),
        margenMes: r2(ventasMes.reduce((s, v) => s + v.total - v.costo, 0)),
        cobradoMes: r2(cobrado(db, { desde: ini, hasta: fecha, sucursal })),
        porCobrar: r2(pc.reduce((s, f) => s + f.saldo, 0)),
        proformasAbiertas: abiertas.length,
        proformasAbiertasMonto: r2(abiertas.reduce((s, p) => s + p.total, 0)),
        comprasUrgentes: compras.filter((c) => c.urgencia === 'urgente').length,
        planchasEnCorte: db.prepare(`SELECT COUNT(*) n FROM planchas WHERE estado = 'en_corte' ${sucursal ? 'AND sucursal_id = ?' : ''}`).get(...(sucursal ? [sucursal] : [])).n,
      },
      porMes,
      ultimas,
      porVencer: porVencer.map((p) => ({ ...p, vence: sumarDias(p.fecha, p.validez_dias) })),
      compras: compras.slice(0, 6),
    })
  }))

  // ── Panel del dueño (adminj): GET /api/dueno/resumen?mes=AAAA-MM&sucursal=ID ──
  r.get('/dueno/resumen', exigir('dueno'), manejar((req, res) => {
    res.json(resumenDueno(db, { mes: req.query.mes, sucursal: req.query.sucursal }))
  }))

  return r
}

/** JSON del panel del dueño (contrato en docs/API.md y apps/dueno/README.md). */
export function resumenDueno(db, { mes, sucursal }) {
  const fecha = hoy()
  const m = /^\d{4}-\d{2}$/.test(String(mes ?? '')) ? mes : fecha.slice(0, 7)
  const suc = sucursal && sucursal !== 'todas' ? Number(sucursal) : null
  const desde = `${m}-01`
  const hasta = finDeMes(m) < fecha ? finDeMes(m) : fecha
  const sucursales = db.prepare('SELECT id, nombre FROM sucursales WHERE activo = 1 ORDER BY id').all()
  if (suc && !sucursales.some((s) => s.id === suc)) throw invalido('Sucursal desconocida.')
  marcarVencidas(db)

  const ventas = ventasRango(db, { desde, hasta, sucursal: suc }).filter((v) => v.estado === 'vigente')
  const ingresos = r2(ventas.reduce((s, v) => s + v.total, 0))
  // Si el mes está en curso, se compara con el mismo tramo de días del mes anterior (comparación justa)
  const mesAnt = sumarMeses(m, -1)
  const tramo = sumarDias(`${mesAnt}-01`, Number(hasta.slice(8, 10)) - 1)
  const hastaAnt = hasta < finDeMes(m) && tramo < finDeMes(mesAnt) ? tramo : finDeMes(mesAnt)
  const ingresosAnt = r2(ventasRango(db, { desde: `${mesAnt}-01`, hasta: hastaAnt, sucursal: suc }).filter((v) => v.estado === 'vigente').reduce((s, v) => s + v.total, 0))
  const eg = egresosPorCategoria(db, { desde, hasta: finDeMes(m), sucursal: suc })
  const gastos = r2(eg.reduce((s, e) => s + e.monto, 0))

  const produccion = produccionPorProducto(lineasVendidas(db, { desde, hasta, sucursal: suc }).filter((l) => l.categoria === 'plancha')).slice(0, 6)
  const cortes = cortesRango(db, { desde, hasta, sucursal: suc })
  const mermaTot = mermasPor(cortes.map((c) => ({ ...c, todo: 'x' })), 'todo')[0]
  const planchasCortadas = db.prepare(`SELECT COUNT(DISTINCT c.plancha_id) n FROM plancha_cortes c JOIN planchas p ON p.id = c.plancha_id WHERE c.fecha BETWEEN ? AND ? ${suc ? 'AND p.sucursal_id = ?' : ''}`).get(desde, hasta, ...(suc ? [suc] : [])).n
  const compras = listaCompras(db, { sucursal: suc, fecha }).slice(0, 8)
  const vendedores = conversionPorVendedor(proformasRango(db, { desde, hasta, sucursal: suc }))
  const pc = porCobrar(db, { sucursal: suc })

  // Si la planilla del mes aún no se cerró (mes en curso), se estima para no mostrar una ganancia inflada
  let planillaPendiente = 0
  if (!db.prepare('SELECT cerrada FROM planillas WHERE periodo = ?').get(m)?.cerrada && m <= fecha.slice(0, 7)) {
    const p = calcularPlanilla(db.prepare('SELECT * FROM trabajadores').all(), m, leerAjuste(db, 'planilla', AJUSTES_POR_DEFECTO.planilla))
    planillaPendiente = r2(suc ? p.porSucursal[suc]?.total_ganado ?? 0 : p.totales.total_ganado)
  }

  return {
    mes: m,
    hoy: fecha,
    sucursal: suc ? sucursales.find((s) => s.id === suc) : null,
    sucursales,
    ingresos: { total: ingresos, ventas: ventas.length, mesAnterior: ingresosAnt, variacionPct: variacionPct(ingresos, ingresosAnt), comparadoHasta: hastaAnt, mesEnCurso: hasta < finDeMes(m) },
    gastos: { total: gastos, porCategoria: eg.map((e) => ({ categoria: e.categoria, nombre: ETIQUETAS_EGRESO[e.categoria], monto: r2(e.monto) })) },
    resultado: { total: r2(ingresos - gastos), positivo: ingresos - gastos >= 0 },
    pendientes: { planilla: planillaPendiente, resultadoEstimado: r2(ingresos - gastos - planillaPendiente) },
    cobrado: r2(cobrado(db, { desde, hasta, sucursal: suc })),
    porCobrar: { total: r2(pc.reduce((s, f) => s + f.saldo, 0)), clientes: new Set(pc.map((f) => f.cliente)).size },
    produccion: produccion.map((p) => ({ producto: p.nombre, cantidad: p.cantidad, unidad: p.unidad })),
    mermas: { m2: mermaTot?.mermaM2 ?? 0, porcentaje: mermaTot?.mermaPct ?? 0, cortadoM2: mermaTot?.cortadoM2 ?? 0, planchasCortadas },
    compras: compras.map((c) => ({ material: c.nombre, sucursal: c.sucursal, comprar: c.sugerido, unidad: c.unidad, urgencia: c.urgencia, costoEstimado: c.costoEstimado })),
    vendedores: vendedores.map((v) => ({ nombre: v.nombre, proformas: v.proformas, ventas: v.convertidas, conversionPct: v.tasaPct, vendido: v.montoVendido })),
    actualizado: new Date().toISOString(),
  }
}
