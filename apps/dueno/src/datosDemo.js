// Datos de ejemplo para usar el panel sin backend (modo demo). Misma forma que GET /api/dueno/resumen.
const SUCURSALES = [
  { id: 1, nombre: 'Casa Matriz — Showroom 4to anillo' },
  { id: 2, nombre: 'Fábrica Parque Industrial' },
  { id: 3, nombre: 'Showroom Equipetrol' },
]
const PARTE = { 1: 0.55, 2: 0.1, 3: 0.35 }
const ESTACION = [0.72, 0.68, 0.85, 0.9, 1, 1.18, 1.22, 1.05, 0.95, 1.05, 1.32, 1.35]
const r2 = (n) => Math.round(n * 100) / 100

function azarDe(texto) {
  let h = 2166136261
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function base(mes) {
  const azar = azarDe(mes)
  const factor = ESTACION[Number(mes.slice(5, 7)) - 1] * (0.92 + azar() * 0.16)
  return { ingresos: 340000 * factor, n: Math.round(40 * factor), azar }
}

export function resumenDemo(mes, sucursalId) {
  const parte = sucursalId ? PARTE[sucursalId] : 1
  const b = base(mes)
  const ant = base(sumar(mes, -1))
  const ingresos = r2(b.ingresos * parte)
  const ingresosAnt = r2(ant.ingresos * parte)
  const fijo = { 1: 0.38, 2: 0.42, 3: 0.2 }
  const parteGasto = sucursalId ? fijo[sucursalId] : 1
  const porCategoria = [
    { categoria: 'compras', nombre: 'Compras de material', monto: r2(b.ingresos * 0.47 * parteGasto) },
    { categoria: 'planilla', nombre: 'Sueldos', monto: r2(84500 * parteGasto) },
    { categoria: 'alquiler', nombre: 'Alquiler', monto: r2(22500 * parteGasto) },
    { categoria: 'impuestos', nombre: 'Impuestos', monto: r2(b.ingresos * 0.055 * parteGasto) },
    { categoria: 'servicios', nombre: 'Luz, agua e internet', monto: r2(5400 * parteGasto) },
    { categoria: 'transporte', nombre: 'Transporte', monto: r2(2600 * parteGasto) },
  ].sort((a, c) => c.monto - a.monto)
  const gastos = r2(porCategoria.reduce((s, g) => s + g.monto, 0))
  const prod = [
    ['Granito Negro San Gabriel', 92], ['Granito Blanco Itaúnas', 74], ['Piedra sinterizada Calacatta', 61],
    ['Cuarzo Blanco Polar', 38], ['Granito Café Imperial', 30], ['Mármol Crema Marfil', 18],
  ].map(([producto, m2]) => ({ producto, cantidad: r2(m2 * parte * (0.85 + b.azar() * 0.3) * ESTACION[Number(mes.slice(5, 7)) - 1]), unidad: 'm2' }))
    .sort((a, c) => c.cantidad - a.cantidad)
  const vendedores = [
    ['Carla Mendoza', 1, 0.56], ['Lucía Vaca', 3, 0.48], ['Jorge Suárez', 1, 0.34], ['Rodrigo Justiniano', 3, 0.26],
  ].filter(([, s]) => !sucursalId || s === sucursalId).map(([nombre, , tasa]) => {
    const proformas = Math.round(18 + b.azar() * 14)
    const ventas = Math.round(proformas * tasa)
    return { nombre, proformas, ventas, conversionPct: r2((ventas / proformas) * 100), vendido: r2(ventas * 7200) }
  }).sort((a, c) => c.conversionPct - a.conversionPct)
  const esActual = mes === new Date().toISOString().slice(0, 7)
  const planilla = esActual ? r2(84500 * parteGasto) : 0
  return {
    mes,
    hoy: new Date().toISOString().slice(0, 10),
    demo: true,
    sucursal: sucursalId ? SUCURSALES.find((s) => s.id === sucursalId) : null,
    sucursales: SUCURSALES,
    ingresos: { total: ingresos, ventas: Math.round(b.n * parte), mesAnterior: ingresosAnt, variacionPct: r2(((ingresos - ingresosAnt) / ingresosAnt) * 100) },
    gastos: { total: gastos, porCategoria },
    resultado: { total: r2(ingresos - gastos), positivo: ingresos >= gastos },
    pendientes: { planilla, resultadoEstimado: r2(ingresos - gastos - planilla) },
    cobrado: r2(ingresos * 0.82),
    porCobrar: { total: r2(ingresos * 0.31), clientes: 14 },
    produccion: prod,
    mermas: { m2: r2(6.4 * parte + b.azar()), porcentaje: r2(7 + b.azar() * 4), cortadoM2: r2(78 * parte), planchasCortadas: Math.round(19 * parte) || 1 },
    compras: [
      { material: 'Piedra sinterizada Calacatta', sucursal: 'Fábrica Parque Industrial', comprar: 12, unidad: 'planchas', urgencia: 'urgente', costoEstimado: 55296 },
      { material: 'Preciosa / fragüe (bolsa 5 kg)', sucursal: 'Fábrica Parque Industrial', comprar: 30, unidad: 'bolsa', urgencia: 'urgente', costoEstimado: 1350 },
      { material: 'Granito Negro San Gabriel', sucursal: 'Toda la empresa', comprar: 8, unidad: 'planchas', urgencia: 'pronto', costoEstimado: 11832 },
      { material: 'Pegamento porcelanato (bolsa 25 kg)', sucursal: 'Toda la empresa', comprar: 40, unidad: 'bolsa', urgencia: 'pronto', costoEstimado: 2320 },
    ],
    vendedores,
    actualizado: new Date().toISOString(),
  }
}

function sumar(mes, n) {
  const [a, m] = mes.split('-').map(Number)
  const t = a * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
