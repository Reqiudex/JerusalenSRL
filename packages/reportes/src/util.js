// Utilidades numéricas y de fechas compartidas (sin dependencias).

/** Redondeo a 2 decimales sin errores de coma flotante (1.005 → 1.01). */
export const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

export const suma = (lista, f = (x) => x) => lista.reduce((s, x) => s + (Number(f(x)) || 0), 0)

/** 'AAAA-MM-DD' → Date en UTC (evita corrimientos por zona horaria). */
export function fechaUTC(texto) {
  const [a, m, d] = String(texto).slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(a, (m || 1) - 1, d || 1))
}

export function textoFecha(fecha) {
  return fecha.toISOString().slice(0, 10)
}

export function sumarDias(texto, dias) {
  const f = fechaUTC(texto)
  f.setUTCDate(f.getUTCDate() + dias)
  return textoFecha(f)
}

export function diasEntre(desde, hasta) {
  return Math.round((fechaUTC(hasta) - fechaUTC(desde)) / 86400000)
}

/** 'AAAA-MM' de una fecha 'AAAA-MM-DD'. */
export const mesDe = (fecha) => String(fecha).slice(0, 7)

/** Suma meses a 'AAAA-MM'. */
export function sumarMeses(mes, n) {
  const [a, m] = mes.split('-').map(Number)
  const total = a * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** Lista de meses 'AAAA-MM' desde/hasta inclusive. */
export function rangoMeses(desde, hasta) {
  const lista = []
  for (let m = desde; m <= hasta; m = sumarMeses(m, 1)) {
    lista.push(m)
    if (lista.length > 240) break
  }
  return lista
}

/** Último día del mes 'AAAA-MM' → 'AAAA-MM-DD'. */
export function finDeMes(mes) {
  return sumarDias(`${sumarMeses(mes, 1)}-01`, -1)
}

/** 0 = lunes … 6 = domingo. */
export function diaSemana(fecha) {
  return (fechaUTC(fecha).getUTCDay() + 6) % 7
}

export const NOMBRES_DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const NOMBRES_MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
