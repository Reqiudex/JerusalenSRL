import { describe, expect, it } from 'vitest'
import {
  antiguedad, calcularCostoProyecto, calcularPlanilla, calcularTotales, cantidadItem, conversionPorVendedor, enlaceWhatsApp,
  estaVencida, indiceEstacional, lineaPlanilla, mermasPor, porcentajeAntiguedad, productoMasYMenosExitoso, rangoMeses,
  rankingProductos, recomendacionCompra, saldoVenta, sumarMeses, tendencias, transicionPermitida, ventasPorDiaSemana, ventasPorMes,
} from '../src/index.js'

describe('costos de proyecto', () => {
  it('calcula el ejemplo del pedido: piso de 7 m × 8 m', () => {
    const c = calcularCostoProyecto({
      largo_m: 7, ancho_m: 8, costo_m2: 290, desperdicio_pct: 10, horas: 60, costo_hora: 28, otros: 350, margen_pct: 30,
      insumos: [
        { nombre: 'Pegamento', consumo_m2: 5, presentacion: 25, costo_presentacion: 58 },
        { nombre: 'Cemento', consumo_m2: 2.5, presentacion: 50, costo_presentacion: 62 },
        { nombre: 'Preciosa', consumo_m2: 0.5, presentacion: 5, costo_presentacion: 45 },
      ],
    })
    expect(c.ok).toBe(true)
    expect(c.m2).toBe(56)
    expect(c.m2ConDesperdicio).toBeCloseTo(61.6)
    expect(c.planchas).toBe(13) // 61,6 / 5,1 = 12,08 → 13
    expect(c.desglose.material).toBeCloseTo(61.6 * 290)
    // Pegamento: 280 kg → 12 bolsas; cemento: 140 kg → 3 bolsas; preciosa: 28 kg → 6 bolsas
    expect(c.insumos.map((i) => i.envases)).toEqual([12, 3, 6])
    expect(c.desglose.insumos).toBe(12 * 58 + 3 * 62 + 6 * 45)
    expect(c.desglose.manoObra).toBe(1680)
    const costo = 61.6 * 290 + 1152 + 1680 + 350
    expect(c.costoTotal).toBeCloseTo(costo, 2)
    expect(c.precio).toBeCloseTo(costo / 0.7, 1)
    expect(c.ganancia / c.precio).toBeCloseTo(0.3, 3)
  })
  it('permite m² directos y valida datos', () => {
    expect(calcularCostoProyecto({ m2: 3, costo_m2: 100, desperdicio_pct: 0, margen_pct: 0 }).precio).toBe(300)
    expect(calcularCostoProyecto({ largo_m: 0, ancho_m: 2 }).ok).toBe(false)
    expect(calcularCostoProyecto({ m2: 2, margen_pct: 99 }).ok).toBe(false)
  })
})

describe('proformas', () => {
  it('calcula piezas por m² y totales con descuento', () => {
    expect(cantidadItem({ tipo: 'pieza', ancho_cm: 240, alto_cm: 62, piezas: 2 })).toBeCloseTo(2.98)
    expect(cantidadItem({ tipo: 'servicio', cantidad: 4 })).toBe(4)
    const t = calcularTotales([{ tipo: 'pieza', cantidad: 10, precio_unit: 500 }, { tipo: 'servicio', cantidad: 1, precio_unit: 350 }], 10)
    expect(t).toEqual({ subtotal: 5350, descuentoPct: 10, descuento: 535, total: 4815 })
  })
  it('controla estados y vencimiento', () => {
    expect(transicionPermitida('enviada', 'aceptada')).toBe(true)
    expect(transicionPermitida('convertida', 'enviada')).toBe(false)
    expect(estaVencida({ estado: 'enviada', fecha: '2026-11-01', validez_dias: 15 }, '2026-11-17')).toBe(true)
    expect(estaVencida({ estado: 'enviada', fecha: '2026-11-01', validez_dias: 15 }, '2026-11-16')).toBe(false)
    expect(estaVencida({ estado: 'convertida', fecha: '2026-01-01', validez_dias: 15 }, '2026-11-17')).toBe(false)
  })
  it('saldo de venta y enlace de WhatsApp con 591', () => {
    expect(saldoVenta(1000, [{ monto: 400 }, { monto: 100 }])).toEqual({ pagado: 500, saldo: 500, estadoPago: 'parcial' })
    expect(saldoVenta(1000, [{ monto: 1000 }]).estadoPago).toBe('pagada')
    expect(enlaceWhatsApp('7123-4567', 'hola')).toBe('https://wa.me/59171234567?text=hola')
  })
})

describe('planilla', () => {
  it('antigüedad y bono', () => {
    expect(antiguedad('2008-02-11', '2026-11-30')).toMatchObject({ anios: 18, meses: 9 })
    expect(porcentajeAntiguedad(1)).toBe(0)
    expect(porcentajeAntiguedad(2)).toBe(5)
    expect(porcentajeAntiguedad(18)).toBe(34)
    expect(porcentajeAntiguedad(30)).toBe(50)
  })
  it('calcula la línea y los totales por sucursal', () => {
    const l = lineaPlanilla({ id: 1, nombre: 'A', sueldo: 4000, fecha_ingreso: '2020-01-01', sucursal_id: 1 }, '2026-11', { salario_minimo: 2750, aporte_laboral_pct: 12.71 })
    expect(l.bono_antiguedad_pct).toBe(11) // 6 años
    expect(l.bono_antiguedad).toBeCloseTo(3 * 2750 * 0.11)
    expect(l.total_ganado).toBeCloseTo(4000 + 907.5)
    expect(l.liquido).toBeCloseTo(4907.5 * (1 - 0.1271), 1)
    // Ingresa a mitad de mes: proporcional
    expect(lineaPlanilla({ id: 2, sueldo: 3000, fecha_ingreso: '2026-11-16' }, '2026-11').haber_basico).toBe(1500)
    const p = calcularPlanilla([
      { id: 1, sueldo: 3000, fecha_ingreso: '2025-01-01', sucursal_id: 1, activo: 1 },
      { id: 2, sueldo: 3000, fecha_ingreso: '2025-01-01', sucursal_id: 2, activo: 1 },
      { id: 3, sueldo: 3000, fecha_ingreso: '2027-01-01', sucursal_id: 2, activo: 1 }, // aún no ingresa
      { id: 4, sueldo: 3000, fecha_ingreso: '2020-01-01', fecha_salida: '2026-06-30', sucursal_id: 2, activo: 0 },
    ], '2026-11')
    expect(p.totales.trabajadores).toBe(2)
    expect(Object.keys(p.porSucursal)).toEqual(['1', '2'])
  })
})

const ventas = [
  { fecha: '2026-01-05', total: 100, costo: 60, estado: 'vigente' }, // lunes
  { fecha: '2026-01-10', total: 300, costo: 100, estado: 'vigente' }, // sábado
  { fecha: '2026-03-07', total: 200, costo: 100, estado: 'vigente' }, // sábado
  { fecha: '2026-03-08', total: 999, costo: 0, estado: 'anulada' },
]

describe('reportes', () => {
  it('ventas por mes completa los meses vacíos y excluye anuladas', () => {
    const m = ventasPorMes(ventas)
    expect(m.map((x) => x.mes)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(m[0]).toMatchObject({ total: 400, cantidad: 2, margen: 240 })
    expect(m[1].total).toBe(0)
  })
  it('ventas por día de la semana', () => {
    const d = ventasPorDiaSemana(ventas)
    expect(d[0]).toMatchObject({ nombre: 'Lunes', total: 100 })
    expect(d[5]).toMatchObject({ nombre: 'Sábado', total: 500, cantidad: 2, promedioPorDia: 250 })
  })
  it('índice estacional', () => {
    const idx = indiceEstacional([{ mes: '2026-01', total: 100 }, { mes: '2026-02', total: 300 }])
    expect(idx[0].indice).toBe(0.5)
    expect(idx[1].indice).toBe(1.5)
    expect(idx[5].indice).toBeNull()
  })
  const lineas = [
    { fecha: '2026-10-01', material_id: 1, nombre: 'Granito', cantidad: 10, total: 5000, costo: 3000 },
    { fecha: '2026-10-02', material_id: 2, nombre: 'Mármol', cantidad: 2, total: 2000, costo: 1000 },
    { fecha: '2026-10-03', material_id: 1, nombre: 'Granito', cantidad: 5, total: 2500, costo: 1500 },
  ]
  it('más y menos vendidos, incluyendo los que no se vendieron', () => {
    const r = rankingProductos(lineas, { catalogo: [{ id: 1, nombre: 'Granito' }, { id: 2, nombre: 'Mármol' }, { id: 3, nombre: 'Cuarzo' }] })
    expect(r.masVendidos[0]).toMatchObject({ nombre: 'Granito', total: 7500, cantidad: 15 })
    expect(r.menosVendidos[0]).toMatchObject({ nombre: 'Cuarzo', total: 0 })
    expect(rankingProductos(lineas, { por: 'cantidad' }).masVendidos[0].nombre).toBe('Granito')
  })
  it('producto más y menos exitoso', () => {
    const x = productoMasYMenosExitoso(lineas)
    expect(x.masExitoso.nombre).toBe('Granito')
    expect(x.menosExitoso.nombre).toBe('Mármol')
  })
  it('detecta modas (8 semanas vs 12 meses)', () => {
    const hoy = '2026-11-25'
    const l = []
    // Producto A: estable todo el año (1 m² por semana)
    for (let s = 0; s < 52; s++) l.push({ fecha: sumarDiasSimple(hoy, -s * 7), material_id: 1, nombre: 'A', cantidad: 1 })
    // Producto B: casi nada hasta hace 8 semanas, luego 3 m² por semana
    l.push({ fecha: '2026-03-01', material_id: 2, nombre: 'B', cantidad: 1 })
    for (let s = 0; s < 8; s++) l.push({ fecha: sumarDiasSimple(hoy, -s * 7), material_id: 2, nombre: 'B', cantidad: 3 })
    const t = tendencias(l, { hoy })
    expect(t[0]).toMatchObject({ nombre: 'B', estado: 'moda' })
    expect(t.find((x) => x.nombre === 'A').estado).toBe('estable')
  })
  it('recomienda compras según stock, mínimo y demanda', () => {
    const hoy = '2026-11-25'
    const l = Array.from({ length: 90 }, (_, i) => ({ fecha: sumarDiasSimple(hoy, -i), material_id: 1, cantidad: 1 }))
    const r = recomendacionCompra([
      { material_id: 1, nombre: 'Pegamento', stock: 10, minimo: 20 },
      { material_id: 2, nombre: 'Sin demanda', stock: 50, minimo: 5 },
    ], l, { hoy, diasCobertura: 30 })
    expect(r).toHaveLength(1)
    // demanda ≈ 89/90 por día → 29,7 en 30 días; sugerido = 20 + 29,7 − 10 → 40
    expect(r[0]).toMatchObject({ nombre: 'Pegamento', urgencia: 'urgente', sugerido: 40 })
  })
  it('conversión por vendedor sin contar borradores', () => {
    const c = conversionPorVendedor([
      { vendedor_id: 1, vendedor: 'Ana', estado: 'convertida', total: 100 },
      { vendedor_id: 1, vendedor: 'Ana', estado: 'rechazada', total: 50 },
      { vendedor_id: 1, vendedor: 'Ana', estado: 'borrador', total: 50 },
      { vendedor_id: 2, vendedor: 'Luis', estado: 'vencida', total: 80 },
    ])
    expect(c[0]).toMatchObject({ nombre: 'Ana', proformas: 2, convertidas: 1, tasaPct: 50, montoVendido: 100 })
    expect(c[1]).toMatchObject({ nombre: 'Luis', tasaPct: 0, vencidas: 1 })
  })
  it('mermas por material y por cortador', () => {
    const m = mermasPor([
      { tipo: 'vendido', w: 100, h: 100, material: 'G', cortador: 'A' },
      { tipo: 'merma', w: 100, h: 10, material: 'G', cortador: 'A' },
    ], 'cortador')
    expect(m[0]).toMatchObject({ clave: 'A', cortadoM2: 1.1, mermaM2: 0.1 })
    expect(m[0].mermaPct).toBeCloseTo(9.09, 1)
  })
  it('utilidades de meses', () => {
    expect(sumarMeses('2026-11', 3)).toBe('2027-02')
    expect(sumarMeses('2026-01', -1)).toBe('2025-12')
    expect(rangoMeses('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })
})

function sumarDiasSimple(f, d) {
  const x = new Date(`${f}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + d)
  return x.toISOString().slice(0, 10)
}
