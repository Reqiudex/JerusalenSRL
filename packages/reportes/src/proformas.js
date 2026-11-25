/**
 * Reglas de proformas y ventas: totales, estados y vencimiento.
 */
import { r2, sumarDias } from './util.js'

export const ESTADOS_PROFORMA = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  convertida: 'Convertida en venta',
  vencida: 'Vencida',
  rechazada: 'Rechazada',
}

/** Transiciones permitidas de estado. */
const TRANSICIONES = {
  borrador: ['enviada', 'rechazada'],
  enviada: ['aceptada', 'rechazada', 'vencida', 'convertida', 'borrador'],
  aceptada: ['convertida', 'rechazada', 'enviada'],
  vencida: ['enviada', 'rechazada'], // se puede reenviar con nueva fecha
  rechazada: ['borrador'],
  convertida: [],
}

export function transicionPermitida(de, a) {
  return (TRANSICIONES[de] ?? []).includes(a)
}

export const TIPOS_ITEM = {
  plancha: 'Plancha entera',
  pieza: 'Pieza por m²',
  servicio: 'Servicio (corte, colocación…)',
  insumo: 'Insumo / accesorio',
}

/**
 * Cantidad de un ítem. Para «pieza» se calcula con ancho × alto (cm) × piezas
 * si vienen las medidas; si no, se usa la cantidad escrita (m²).
 */
export function cantidadItem(item) {
  if (item.tipo === 'pieza' && Number(item.ancho_cm) > 0 && Number(item.alto_cm) > 0) {
    const piezas = Number(item.piezas) > 0 ? Number(item.piezas) : 1
    return r2((Number(item.ancho_cm) * Number(item.alto_cm) * piezas) / 10000)
  }
  return Number(item.cantidad) || 0
}

export function totalItem(item) {
  return r2(cantidadItem(item) * (Number(item.precio_unit) || 0))
}

/** Subtotal, descuento (en %) y total. */
export function calcularTotales(items, descuentoPct = 0) {
  const subtotal = r2(items.reduce((s, i) => s + totalItem(i), 0))
  const pct = Math.min(100, Math.max(0, Number(descuentoPct) || 0))
  const descuento = r2((subtotal * pct) / 100)
  return { subtotal, descuentoPct: pct, descuento, total: r2(subtotal - descuento) }
}

export function fechaVencimiento(proforma) {
  return sumarDias(proforma.fecha, Number(proforma.validez_dias) || 0)
}

/** Una proforma enviada o aceptada vence si pasó su validez sin convertirse. */
export function estaVencida(proforma, hoy) {
  return ['enviada', 'aceptada'].includes(proforma.estado) && fechaVencimiento(proforma) < hoy
}

/** Saldo de una venta según sus pagos. */
export function saldoVenta(total, pagos) {
  const pagado = r2(pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0))
  return { pagado, saldo: r2(Math.max(0, total - pagado)), estadoPago: pagado >= total - 0.005 ? 'pagada' : pagado > 0 ? 'parcial' : 'pendiente' }
}

/** Texto para enviar por WhatsApp. */
export function textoWhatsApp(proforma, empresa = {}) {
  const lineas = [
    `*${empresa.nombre ?? 'Jerusalén S.R.L.'}* — Proforma ${proforma.codigo}`,
    `Cliente: ${proforma.cliente ?? ''}`,
    '',
    ...proforma.items.map((i) => `• ${i.descripcion}: ${cantidadItem(i)} ${i.unidad ?? ''} × Bs ${i.precio_unit} = Bs ${totalItem(i)}`),
    '',
  ]
  const t = calcularTotales(proforma.items, proforma.descuento_pct)
  if (t.descuento > 0) lineas.push(`Subtotal: Bs ${t.subtotal}`, `Descuento (${t.descuentoPct} %): −Bs ${t.descuento}`)
  lineas.push(`*Total: Bs ${t.total}*`, `Válida hasta: ${fechaVencimiento(proforma)}`)
  return lineas.join('\n')
}

/** Enlace wa.me con número boliviano (agrega 591 si falta). */
export function enlaceWhatsApp(telefono, texto) {
  let n = String(telefono ?? '').replace(/\D/g, '')
  if (n.length === 8) n = `591${n}`
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}
