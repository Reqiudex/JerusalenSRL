/**
 * Reportes y tendencias (funciones puras).
 *
 * Entradas (las arma la API a partir del esquema SQLite):
 *   ventas:  [{ id, fecha:'AAAA-MM-DD', sucursal_id, vendedor_id, total, costo, estado }]
 *   lineas:  [{ fecha, material_id, nombre, cantidad, unidad, total, costo }]   (ítems vendidos)
 *   catalogo:[{ id, nombre, unidad, activo }]
 *   proformas:[{ vendedor_id, vendedor, estado, total }]
 *   cortes:  [{ tipo, w, h, material, cortador }]   (cortes de planchas, en cm)
 */
import { NOMBRES_DIAS, diaSemana, diasEntre, mesDe, r2, rangoMeses, sumarDias } from './util.js'

const vigentes = (ventas) => ventas.filter((v) => v.estado !== 'anulada')

// ───────────────────── Productos ─────────────────────

/** Agrupa líneas por material: cantidad, total vendido, margen y nº de ventas. */
export function totalesPorProducto(lineas, catalogo = []) {
  const mapa = new Map()
  for (const c of catalogo) {
    if (c.activo === 0 || c.activo === false) continue
    mapa.set(c.id, { material_id: c.id, nombre: c.nombre, unidad: c.unidad, cantidad: 0, total: 0, costo: 0, lineas: 0 })
  }
  for (const l of lineas) {
    if (l.material_id == null) continue
    const fila = mapa.get(l.material_id) ?? { material_id: l.material_id, nombre: l.nombre, unidad: l.unidad, cantidad: 0, total: 0, costo: 0, lineas: 0 }
    fila.cantidad += Number(l.cantidad) || 0
    fila.total += Number(l.total) || 0
    fila.costo += Number(l.costo) || 0
    fila.lineas += 1
    mapa.set(l.material_id, fila)
  }
  return [...mapa.values()].map((f) => ({
    ...f,
    cantidad: r2(f.cantidad),
    total: r2(f.total),
    costo: r2(f.costo),
    margen: r2(f.total - f.costo),
    margenPct: f.total > 0 ? r2(((f.total - f.costo) / f.total) * 100) : 0,
  }))
}

/**
 * Más y menos vendidos.
 * @param {'total'|'cantidad'} por  criterio (Bs o unidades/m²)
 */
export function rankingProductos(lineas, { catalogo = [], por = 'total', limite = 10 } = {}) {
  const filas = totalesPorProducto(lineas, catalogo)
  const orden = [...filas].sort((a, b) => b[por] - a[por] || a.nombre.localeCompare(b.nombre))
  return {
    masVendidos: orden.slice(0, limite),
    menosVendidos: [...orden].reverse().slice(0, limite),
  }
}

/**
 * Producto más y menos exitoso.
 * Puntaje = 70 % participación en ventas (Bs) + 30 % margen relativo.
 */
export function productoMasYMenosExitoso(lineas, catalogo = []) {
  const filas = totalesPorProducto(lineas, catalogo)
  if (!filas.length) return { masExitoso: null, menosExitoso: null, ranking: [] }
  const maxTotal = Math.max(...filas.map((f) => f.total), 1)
  const ranking = filas
    .map((f) => ({ ...f, puntaje: r2((f.total / maxTotal) * 70 + (Math.max(0, f.margenPct) / 100) * 30) }))
    .sort((a, b) => b.puntaje - a.puntaje)
  return { masExitoso: ranking[0], menosExitoso: ranking[ranking.length - 1], ranking }
}

// ───────────────────── Estacionalidad ─────────────────────

/** Ventas por mes, completando con ceros los meses sin ventas. */
export function ventasPorMes(ventas, { desde, hasta } = {}) {
  const vs = vigentes(ventas)
  if (!vs.length && !(desde && hasta)) return []
  const meses = vs.map((v) => mesDe(v.fecha)).sort()
  const ini = desde ?? meses[0]
  const fin = hasta ?? meses[meses.length - 1]
  const mapa = new Map(rangoMeses(ini, fin).map((m) => [m, { mes: m, total: 0, cantidad: 0, margen: 0 }]))
  for (const v of vs) {
    const f = mapa.get(mesDe(v.fecha))
    if (!f) continue
    f.total += Number(v.total) || 0
    f.margen += (Number(v.total) || 0) - (Number(v.costo) || 0)
    f.cantidad += 1
  }
  return [...mapa.values()].map((f) => ({ ...f, total: r2(f.total), margen: r2(f.margen) }))
}

/** Ventas por día de la semana (lunes a domingo) con promedio por día. */
export function ventasPorDiaSemana(ventas) {
  const filas = NOMBRES_DIAS.map((nombre, dia) => ({ dia, nombre, total: 0, cantidad: 0, fechas: new Set() }))
  for (const v of vigentes(ventas)) {
    const f = filas[diaSemana(v.fecha)]
    f.total += Number(v.total) || 0
    f.cantidad += 1
    f.fechas.add(v.fecha)
  }
  return filas.map(({ fechas, ...f }) => ({
    ...f,
    total: r2(f.total),
    promedioPorDia: fechas.size ? r2(f.total / fechas.size) : 0,
  }))
}

/**
 * Índice estacional por mes del año (1 = mes promedio, 1,3 = 30 % más que el promedio).
 * Recibe el resultado de ventasPorMes.
 */
export function indiceEstacional(porMes) {
  const acum = Array.from({ length: 12 }, () => ({ total: 0, n: 0 }))
  for (const f of porMes) {
    const m = Number(f.mes.slice(5, 7)) - 1
    acum[m].total += f.total
    acum[m].n += 1
  }
  const promedios = acum.map((a) => (a.n ? a.total / a.n : null))
  const validos = promedios.filter((p) => p != null)
  const general = validos.length ? validos.reduce((s, p) => s + p, 0) / validos.length : 0
  return promedios.map((p, i) => ({ mes: i + 1, indice: p == null || !general ? null : r2(p / general) }))
}

// ───────────────────── Tendencias / modas ─────────────────────

/**
 * Compara el ritmo de las últimas `semanas` (por defecto 8) contra el promedio
 * semanal de los últimos 12 meses.
 *  - crecimiento = ritmo reciente / ritmo de 12 meses − 1
 *  - «moda» si crece ≥ 50 % y tiene volumen mínimo; «en caída» si baja ≥ 40 %.
 */
export function tendencias(lineas, { hoy, semanas = 8, minimoLineas = 3, umbralModa = 0.5, umbralCaida = -0.4 } = {}) {
  const inicioReciente = sumarDias(hoy, -semanas * 7)
  const inicioAnual = sumarDias(hoy, -365)
  const semanasAnio = 365 / 7
  const mapa = new Map()
  for (const l of lineas) {
    if (l.material_id == null || l.fecha > hoy || l.fecha <= inicioAnual) continue
    const f = mapa.get(l.material_id) ?? { material_id: l.material_id, nombre: l.nombre, unidad: l.unidad, anual: 0, reciente: 0, lineas: 0 }
    const c = Number(l.cantidad) || 0
    f.anual += c
    f.lineas += 1
    if (l.fecha > inicioReciente) f.reciente += c
    mapa.set(l.material_id, f)
  }
  return [...mapa.values()]
    .map((f) => {
      const ritmoReciente = f.reciente / semanas
      const ritmoAnual = f.anual / semanasAnio
      const crecimiento = ritmoAnual > 0 ? ritmoReciente / ritmoAnual - 1 : 0
      let estado = 'estable'
      if (f.lineas >= minimoLineas && crecimiento >= umbralModa) estado = 'moda'
      else if (f.lineas >= minimoLineas && crecimiento <= umbralCaida) estado = 'en_caida'
      return {
        material_id: f.material_id,
        nombre: f.nombre,
        unidad: f.unidad,
        semanalReciente: r2(ritmoReciente),
        semanalAnual: r2(ritmoAnual),
        crecimientoPct: r2(crecimiento * 100),
        estado,
      }
    })
    .sort((a, b) => b.crecimientoPct - a.crecimientoPct)
}

// ───────────────────── Compras ─────────────────────

/**
 * Recomendación de compra por material (y sucursal si viene en `existencias`).
 *   demanda diaria = vendido en los últimos `diasHistorial` / diasHistorial,
 *   ajustada por la tendencia (factor entre 0,5 y 1,5).
 *   sugerido = mínimo + demanda de `diasCobertura` días − stock (redondeado hacia arriba).
 *
 * @param existencias [{ material_id, nombre, unidad, sucursal_id?, sucursal?, stock, minimo }]
 */
export function recomendacionCompra(existencias, lineas, { hoy, diasHistorial = 90, diasCobertura = 30, tendencia = [] } = {}) {
  const desde = sumarDias(hoy, -diasHistorial)
  const vendido = new Map()
  for (const l of lineas) {
    if (l.fecha <= desde || l.fecha > hoy || l.material_id == null) continue
    const k = l.sucursal_id != null ? `${l.material_id}|${l.sucursal_id}` : `${l.material_id}`
    vendido.set(k, (vendido.get(k) ?? 0) + (Number(l.cantidad) || 0))
    vendido.set(`${l.material_id}`, (vendido.get(`${l.material_id}`) ?? 0) + (k.includes('|') ? Number(l.cantidad) || 0 : 0))
  }
  const factorTendencia = new Map(tendencia.map((t) => [t.material_id, Math.min(1.5, Math.max(0.5, 1 + t.crecimientoPct / 100))]))

  return existencias
    .map((e) => {
      const clave = e.sucursal_id != null && vendido.has(`${e.material_id}|${e.sucursal_id}`) ? `${e.material_id}|${e.sucursal_id}` : `${e.material_id}`
      const factor = factorTendencia.get(e.material_id) ?? 1
      const diaria = ((vendido.get(clave) ?? 0) / diasHistorial) * factor
      const proyectada = diaria * diasCobertura
      const stock = Number(e.stock) || 0
      const minimo = Number(e.minimo) || 0
      const sugerido = Math.max(0, Math.ceil(minimo + proyectada - stock - 1e-9))
      let urgencia = 'ok'
      if (stock < minimo) urgencia = 'urgente'
      else if (sugerido > 0) urgencia = 'pronto'
      return {
        ...e,
        demandaDiaria: r2(diaria),
        demandaProyectada: r2(proyectada),
        diasRestantes: diaria > 0 ? Math.floor(stock / diaria) : null,
        sugerido,
        urgencia,
      }
    })
    .filter((r) => r.sugerido > 0)
    .sort((a, b) => (a.urgencia === b.urgencia ? b.sugerido - a.sugerido : a.urgencia === 'urgente' ? -1 : 1))
}

// ───────────────────── Vendedores ─────────────────────

/** Proformas por vendedor y tasa de conversión a ventas (sin contar borradores). */
export function conversionPorVendedor(proformas) {
  const mapa = new Map()
  for (const p of proformas) {
    if (p.estado === 'borrador') continue
    const f = mapa.get(p.vendedor_id) ?? {
      vendedor_id: p.vendedor_id,
      nombre: p.vendedor ?? `Vendedor ${p.vendedor_id}`,
      proformas: 0,
      convertidas: 0,
      rechazadas: 0,
      vencidas: 0,
      abiertas: 0,
      montoProformas: 0,
      montoVendido: 0,
    }
    f.proformas += 1
    f.montoProformas += Number(p.total) || 0
    if (p.estado === 'convertida') {
      f.convertidas += 1
      f.montoVendido += Number(p.total) || 0
    } else if (p.estado === 'rechazada') f.rechazadas += 1
    else if (p.estado === 'vencida') f.vencidas += 1
    else f.abiertas += 1
    mapa.set(p.vendedor_id, f)
  }
  return [...mapa.values()]
    .map((f) => ({
      ...f,
      montoProformas: r2(f.montoProformas),
      montoVendido: r2(f.montoVendido),
      tasaPct: f.proformas ? r2((f.convertidas / f.proformas) * 100) : 0,
    }))
    .sort((a, b) => b.tasaPct - a.tasaPct || b.montoVendido - a.montoVendido)
}

// ───────────────────── Mermas y producción ─────────────────────

/** Mermas agrupadas por `clave` ('material' o 'cortador'). Áreas en m². */
export function mermasPor(cortes, clave = 'material') {
  const mapa = new Map()
  for (const c of cortes) {
    const k = c[clave] ?? 'Sin dato'
    const f = mapa.get(k) ?? { clave: k, cortadoM2: 0, mermaM2: 0, cortes: 0 }
    const m2 = ((Number(c.w) || 0) * (Number(c.h) || 0)) / 10000
    // Las piezas hijas ya están dentro de su retazo: se cuentan solo las hojas
    if (!c.tieneHijos) f.cortadoM2 += m2
    if (c.tipo === 'merma') f.mermaM2 += m2
    f.cortes += 1
    mapa.set(k, f)
  }
  return [...mapa.values()]
    .map((f) => ({ ...f, cortadoM2: r2(f.cortadoM2), mermaM2: r2(f.mermaM2), mermaPct: f.cortadoM2 ? r2((f.mermaM2 / f.cortadoM2) * 100) : 0 }))
    .sort((a, b) => b.mermaM2 - a.mermaM2)
}

/** Producción (m² o unidades) por producto en un periodo. */
export function produccionPorProducto(lineas, { desde, hasta, soloM2 = true } = {}) {
  const filtradas = lineas.filter((l) => (!desde || l.fecha >= desde) && (!hasta || l.fecha <= hasta) && (!soloM2 || l.unidad === 'm2'))
  return totalesPorProducto(filtradas)
    .filter((f) => f.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad)
    .map(({ material_id, nombre, unidad, cantidad, total }) => ({ material_id, nombre, unidad, cantidad, total }))
}

/** Variación porcentual entre dos valores (null si no hay base). */
export function variacionPct(actual, anterior) {
  if (!anterior) return null
  return r2(((actual - anterior) / Math.abs(anterior)) * 100)
}

export { diasEntre }
