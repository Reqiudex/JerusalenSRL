// Textos y cálculos del panel del dueño (puros, probados con Vitest).
import { bsParaVoz, formatearBs, formatearMes, formatearNumero, formatearUnidad, sumarMes } from '@ui/formatos.js'

export function saludo(hora) {
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** «12 % más que octubre» / «5 % menos que octubre» / null */
export function textoVariacion(pct, mes) {
  if (pct == null || !Number.isFinite(pct)) return null
  const anterior = formatearMes(sumarMes(mes, -1)).split(' de ')[0]
  if (Math.abs(pct) < 0.5) return { texto: `Igual que ${anterior}`, sube: null }
  return { texto: `${formatearNumero(Math.abs(pct), 0)} % ${pct > 0 ? 'más' : 'menos'} que ${anterior}`, sube: pct > 0 }
}

/** Interpretación simple de la merma. */
export function nivelMerma(pct) {
  if (pct >= 12) return { texto: 'Alta', nivel: 'peligro' }
  if (pct >= 8) return { texto: 'Un poco alta', nivel: 'alerta' }
  return { texto: 'Normal', nivel: 'ok' }
}

/** «De cada 10, cierra 5» */
export function deCadaDiez(pct) {
  return `De cada 10, cierra ${Math.round((Number(pct) || 0) / 10)}`
}

export function textoCompra(c) {
  const u = formatearUnidad(c.unidad)
  return `${formatearNumero(c.comprar, 0)} ${u} de ${c.material}`
}

/** Lo que dice el botón «Escuchar» de cada tarjeta. */
export function textosVoz(d) {
  const mes = formatearMes(d.mes).split(' de ')[0]
  const v = textoVariacion(d.ingresos.variacionPct, d.mes)
  const gastos = d.gastos.porCategoria.slice(0, 3).map((g) => `${g.nombre}, ${bsParaVoz(g.monto)}`).join('. ')
  const queda = d.resultado.total
  return {
    gane: `En ${mes} vendió ${bsParaVoz(d.ingresos.total)}, en ${d.ingresos.ventas} ventas.${v ? ` Es ${v.texto}${d.ingresos.mesEnCurso ? ', comparando los mismos días' : ''}.` : ''} Le deben ${bsParaVoz(d.porCobrar.total)}.`,
    gaste: `En ${mes} gastó ${bsParaVoz(d.gastos.total)}. ${gastos}.`,
    queda: `${queda >= 0 ? 'Le quedan' : 'Perdió'} ${bsParaVoz(Math.abs(queda))}.${d.pendientes?.planilla > 0 ? ` Todavía falta pagar los sueldos del mes, más o menos ${bsParaVoz(d.pendientes.planilla)}. Después de pagarlos ${d.pendientes.resultadoEstimado >= 0 ? 'quedarían' : 'faltarían'} ${bsParaVoz(Math.abs(d.pendientes.resultadoEstimado))}.` : ''}`,
    produccion: d.produccion.length
      ? `Lo que más se vendió: ${d.produccion.slice(0, 4).map((p) => `${p.producto}, ${Math.round(p.cantidad)} metros cuadrados`).join('. ')}.`
      : 'Este mes todavía no hay producción registrada.',
    mermas: `Se desperdiciaron ${formatearNumero(d.mermas.m2, 1)} metros cuadrados, el ${formatearNumero(d.mermas.porcentaje, 0)} por ciento de lo cortado. Eso es ${nivelMerma(d.mermas.porcentaje).texto.toLowerCase()}.`,
    comprar: d.compras.length
      ? `Hay que comprar: ${d.compras.slice(0, 5).map((c) => `${textoCompra(c)}${c.urgencia === 'urgente' ? ', urgente' : ''}`).join('. ')}.`
      : 'No hace falta comprar nada por ahora.',
    vendedores: d.vendedores.length
      ? d.vendedores.map((x) => `${x.nombre} hizo ${x.proformas} proformas y cerró ${x.ventas} ventas.`).join(' ')
      : 'Este mes no hay proformas.',
  }
}

export const formatoGrande = (n) => formatearBs(n, { entero: true })
