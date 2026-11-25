// Formatos para Bolivia: Bs, coma decimal, punto de miles, fechas dd/mm/aaaa.

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** 1234567.891 → «1.234.567,89» */
export function formatearNumero(n, decimales = 2) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  const fijo = Math.abs(v).toFixed(decimales)
  const [entero, dec] = fijo.split('.')
  const signo = v < 0 && Number(fijo) !== 0 ? '−' : ''
  return signo + entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? `,${dec}` : '')
}

/** «Bs 1.234,50». Con `entero` sin decimales: «Bs 1.235». */
export function formatearBs(n, { entero = false } = {}) {
  return `Bs ${formatearNumero(n, entero ? 0 : 2)}`
}

/** Versión corta para gráficos: Bs 12,3 mil · Bs 1,2 M */
export function formatearBsCorto(n) {
  const v = Number(n) || 0
  const a = Math.abs(v)
  if (a >= 1e6) return `Bs ${formatearNumero(v / 1e6, 1)} M`
  if (a >= 1e3) return `Bs ${formatearNumero(v / 1e3, a >= 1e5 ? 0 : 1)} mil`
  return `Bs ${formatearNumero(v, 0)}`
}

export function formatearPorcentaje(n, decimales = 1) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `${formatearNumero(n, decimales)} %`
}

/** «2026-11-25» → «25/11/2026» */
export function formatearFecha(f) {
  if (!f) return '—'
  const [a, m, d] = String(f).slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** «2026-11» → «noviembre de 2026» (o «nov 2026» si es corto) */
export function formatearMes(mes, { corto = false } = {}) {
  const [a, m] = String(mes).split('-').map(Number)
  return corto ? `${MESES_CORTOS[m - 1]} ${String(a).slice(2)}` : `${MESES[m - 1]} de ${a}`
}

export function sumarMes(mes, n) {
  const [a, m] = mes.split('-').map(Number)
  const t = a * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}

/** Número para leer en voz alta: sin separadores para que el sintetizador lo diga bien. */
export function bsParaVoz(n) {
  const v = Math.round(Number(n) || 0)
  return `${v < 0 ? 'menos ' : ''}${Math.abs(v)} bolivianos`
}

/** Unidades legibles */
export function formatearUnidad(u) {
  return { m2: 'm²', ml: 'm', unidad: 'unid.', servicio: 'serv.', bolsa: 'bolsas', planchas: 'planchas', kg: 'kg' }[u] ?? u ?? ''
}
