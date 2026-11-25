/**
 * Costo y precio de un trabajo (proyecto), p. ej. un piso de 7 m × 8 m.
 *
 * Se usa igual en el ERP (cálculo en vivo) y en la API (al guardar),
 * así el número que ve el vendedor es el mismo que queda en la base.
 *
 * Margen: se calcula SOBRE EL PRECIO (precio = costo / (1 − margen)).
 * Con 30 % de margen, de cada 100 Bs cobrados 30 son ganancia.
 */
import { r2 } from './util.js'

/** Área estándar de una plancha de 300 × 170 cm. */
export const AREA_PLANCHA_ESTANDAR_M2 = 5.1

/**
 * @param {object} e
 * @param {number} e.largo_m           largo en metros
 * @param {number} e.ancho_m           ancho en metros
 * @param {number} [e.m2]              si se da, reemplaza largo × ancho (piezas sueltas)
 * @param {number} e.costo_m2          costo del material por m²
 * @param {number} [e.desperdicio_pct] desperdicio de corte (por defecto 10 %)
 * @param {number} [e.area_plancha_m2] para calcular cuántas planchas comprar
 * @param {Array}  [e.insumos]         [{ nombre, consumo_m2, presentacion, costo_presentacion, unidad }]
 *                                     consumo_m2 = kg (o unidades) por m²; presentacion = kg por bolsa
 * @param {number} [e.horas]           horas de mano de obra
 * @param {number} [e.costo_hora]      costo de la hora (Bs)
 * @param {number} [e.otros]           transporte, viáticos, etc. (Bs)
 * @param {number} [e.margen_pct]      margen sobre el precio (0–90)
 */
export function calcularCostoProyecto(e) {
  const errores = []
  const num = (v, d = 0) => (v === '' || v == null || Number.isNaN(Number(v)) ? d : Number(v))
  const largo = num(e.largo_m)
  const ancho = num(e.ancho_m)
  const m2 = e.m2 != null && e.m2 !== '' ? num(e.m2) : largo * ancho
  const desperdicio = num(e.desperdicio_pct, 10)
  const margen = num(e.margen_pct, 30)
  const costoM2 = num(e.costo_m2)
  const horas = num(e.horas)
  const costoHora = num(e.costo_hora)
  const otros = num(e.otros)
  const areaPlancha = num(e.area_plancha_m2, AREA_PLANCHA_ESTANDAR_M2) || AREA_PLANCHA_ESTANDAR_M2

  if (m2 <= 0) errores.push('Indica las medidas (largo y ancho) o los m².')
  if (desperdicio < 0 || desperdicio > 100) errores.push('El desperdicio debe estar entre 0 y 100 %.')
  if (margen < 0 || margen >= 95) errores.push('El margen debe estar entre 0 y 95 %.')
  if (costoM2 < 0 || horas < 0 || costoHora < 0 || otros < 0) errores.push('No se aceptan valores negativos.')

  const m2ConDesperdicio = m2 * (1 + desperdicio / 100)
  const planchas = m2 > 0 ? Math.ceil(m2ConDesperdicio / areaPlancha - 1e-9) : 0
  const costoMaterial = m2ConDesperdicio * costoM2
  const costoDesperdicio = (m2ConDesperdicio - m2) * costoM2

  const insumos = (e.insumos ?? []).map((i) => {
    const consumo = num(i.consumo_m2)
    const presentacion = num(i.presentacion, 1) || 1
    const cantidad = consumo * m2
    const envases = cantidad > 0 ? Math.ceil(cantidad / presentacion - 1e-9) : 0
    return {
      nombre: i.nombre ?? 'Insumo',
      unidad: i.unidad ?? 'kg',
      consumo_m2: consumo,
      presentacion,
      cantidad: r2(cantidad),
      envases,
      costo: r2(envases * num(i.costo_presentacion)),
    }
  })
  const costoInsumos = insumos.reduce((s, i) => s + i.costo, 0)
  const manoObra = horas * costoHora
  const costoTotal = costoMaterial + costoInsumos + manoObra + otros
  const precio = margen < 100 ? costoTotal / (1 - margen / 100) : costoTotal
  const ganancia = precio - costoTotal

  return {
    ok: errores.length === 0,
    errores,
    m2: r2(m2),
    m2ConDesperdicio: r2(m2ConDesperdicio),
    planchas,
    desglose: {
      material: r2(costoMaterial),
      desperdicio: r2(costoDesperdicio), // ya incluido en material; se muestra aparte
      insumos: r2(costoInsumos),
      manoObra: r2(manoObra),
      otros: r2(otros),
    },
    insumos,
    costoTotal: r2(costoTotal),
    costoM2: m2 > 0 ? r2(costoTotal / m2) : 0,
    margenPct: margen,
    ganancia: r2(ganancia),
    precio: r2(precio),
    precioM2: m2 > 0 ? r2(precio / m2) : 0,
  }
}

/** Insumos típicos para colocar piso/revestimiento de piedra (valores editables). */
export const INSUMOS_TIPICOS = [
  { nombre: 'Pegamento (cemento cola)', consumo_m2: 5, presentacion: 25, costo_presentacion: 58, unidad: 'kg' },
  { nombre: 'Cemento', consumo_m2: 2.5, presentacion: 50, costo_presentacion: 62, unidad: 'kg' },
  { nombre: 'Preciosa / fragüe', consumo_m2: 0.5, presentacion: 5, costo_presentacion: 45, unidad: 'kg' },
]
