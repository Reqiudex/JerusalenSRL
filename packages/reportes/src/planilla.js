/**
 * Planilla de sueldos (Bolivia).
 *
 * Valores por defecto CONFIGURABLES desde Ajustes, porque cambian por decreto:
 *  - salario mínimo nacional (Bs 2.750 en 2025)
 *  - aporte laboral a la AFP/Gestora: 12,71 %
 *  - bono de antigüedad: % sobre 3 salarios mínimos según años trabajados.
 * Revisar con el contador antes de usar en planillas oficiales.
 */
import { r2, fechaUTC, finDeMes } from './util.js'

export const PLANILLA_POR_DEFECTO = {
  salario_minimo: 2750,
  aporte_laboral_pct: 12.71,
  bono_antiguedad: true,
}

/** Escala de bono de antigüedad: [años desde, %]. */
export const ESCALA_ANTIGUEDAD = [
  [25, 50],
  [20, 42],
  [15, 34],
  [11, 26],
  [8, 18],
  [5, 11],
  [2, 5],
  [0, 0],
]

/** Años, meses y días cumplidos entre la fecha de ingreso y la fecha de referencia. */
export function antiguedad(fechaIngreso, fechaReferencia) {
  const a = fechaUTC(fechaIngreso)
  const b = fechaUTC(fechaReferencia)
  if (b < a) return { anios: 0, meses: 0, dias: 0, texto: 'Aún no ingresa' }
  let anios = b.getUTCFullYear() - a.getUTCFullYear()
  let meses = b.getUTCMonth() - a.getUTCMonth()
  let dias = b.getUTCDate() - a.getUTCDate()
  if (dias < 0) {
    meses -= 1
    dias += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate()
  }
  if (meses < 0) {
    anios -= 1
    meses += 12
  }
  const partes = []
  if (anios) partes.push(`${anios} año${anios === 1 ? '' : 's'}`)
  if (meses) partes.push(`${meses} mes${meses === 1 ? '' : 'es'}`)
  if (!anios && !meses) partes.push(`${dias} día${dias === 1 ? '' : 's'}`)
  return { anios, meses, dias, texto: partes.join(' y ') }
}

export function porcentajeAntiguedad(anios) {
  for (const [desde, pct] of ESCALA_ANTIGUEDAD) if (anios >= desde) return pct
  return 0
}

/**
 * Línea de planilla de un trabajador para el periodo 'AAAA-MM'.
 * Los que ingresan durante el mes cobran proporcional a los días (base 30).
 */
export function lineaPlanilla(trabajador, periodo, config = PLANILLA_POR_DEFECTO) {
  const cfg = { ...PLANILLA_POR_DEFECTO, ...config }
  const fin = finDeMes(periodo)
  const inicio = `${periodo}-01`
  const ant = antiguedad(trabajador.fecha_ingreso, fin)
  let diasTrabajados = 30
  if (trabajador.fecha_ingreso > fin) diasTrabajados = 0
  else if (trabajador.fecha_ingreso > inicio) diasTrabajados = Math.max(0, 30 - (Number(trabajador.fecha_ingreso.slice(8, 10)) - 1))
  // Si sale durante el mes, cobra hasta su último día
  if (trabajador.fecha_salida && trabajador.fecha_salida >= inicio && trabajador.fecha_salida < fin) {
    const ultimo = Math.min(30, Number(trabajador.fecha_salida.slice(8, 10)))
    const primero = trabajador.fecha_ingreso > inicio ? Number(trabajador.fecha_ingreso.slice(8, 10)) : 1
    diasTrabajados = Math.max(0, ultimo - primero + 1)
  }

  const sueldoBase = Number(trabajador.sueldo) || 0
  const haberBasico = (sueldoBase * diasTrabajados) / 30
  const pct = cfg.bono_antiguedad ? porcentajeAntiguedad(ant.anios) : 0
  const bonoAntiguedad = ((3 * cfg.salario_minimo * pct) / 100) * (diasTrabajados / 30)
  const totalGanado = haberBasico + bonoAntiguedad
  const aportes = (totalGanado * cfg.aporte_laboral_pct) / 100
  return {
    trabajador_id: trabajador.id,
    nombre: trabajador.nombre,
    cargo: trabajador.cargo,
    sucursal_id: trabajador.sucursal_id,
    antiguedad: ant.texto,
    anios: ant.anios,
    dias_trabajados: diasTrabajados,
    sueldo_base: r2(sueldoBase),
    haber_basico: r2(haberBasico),
    bono_antiguedad_pct: pct,
    bono_antiguedad: r2(bonoAntiguedad),
    total_ganado: r2(totalGanado),
    aportes: r2(aportes),
    liquido: r2(totalGanado - aportes),
  }
}

/** Planilla completa con totales generales y por sucursal. */
export function calcularPlanilla(trabajadores, periodo, config) {
  const fin = finDeMes(periodo)
  const lineas = trabajadores
    .filter((t) => t.fecha_ingreso <= fin && (t.fecha_salida ? t.fecha_salida >= `${periodo}-01` : t.activo !== 0 && t.activo !== false))
    .map((t) => lineaPlanilla(t, periodo, config))
  const totales = (ls) => ({
    trabajadores: ls.length,
    haber_basico: r2(ls.reduce((s, l) => s + l.haber_basico, 0)),
    bono_antiguedad: r2(ls.reduce((s, l) => s + l.bono_antiguedad, 0)),
    total_ganado: r2(ls.reduce((s, l) => s + l.total_ganado, 0)),
    aportes: r2(ls.reduce((s, l) => s + l.aportes, 0)),
    liquido: r2(ls.reduce((s, l) => s + l.liquido, 0)),
  })
  const porSucursal = {}
  for (const l of lineas) (porSucursal[l.sucursal_id] ??= []).push(l)
  return {
    periodo,
    lineas,
    totales: totales(lineas),
    porSucursal: Object.fromEntries(Object.entries(porSucursal).map(([id, ls]) => [id, totales(ls)])),
  }
}
