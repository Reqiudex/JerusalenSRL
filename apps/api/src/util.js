// Errores HTTP, validación de entradas y utilidades comunes de la API.

export class ErrorHttp extends Error {
  constructor(estado, mensaje, extra = {}) {
    super(mensaje)
    this.estado = estado
    this.extra = extra
  }
}

export const noEncontrado = (que = 'Registro') => new ErrorHttp(404, `${que} no encontrado.`)
export const invalido = (mensaje, errores) => new ErrorHttp(422, mensaje, errores ? { errores } : {})
export const prohibido = (mensaje = 'No tienes permiso para esto.') => new ErrorHttp(403, mensaje)

/** Envuelve un manejador para capturar errores (también síncronos). */
export const manejar = (fn) => (req, res, next) => {
  try {
    const r = fn(req, res, next)
    if (r && typeof r.catch === 'function') r.catch(next)
  } catch (e) {
    next(e)
  }
}

export const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const MES = /^\d{4}-\d{2}$/

/**
 * Valida un objeto según reglas simples.
 * reglas: { campo: { tipo:'texto'|'numero'|'entero'|'fecha'|'mes'|'bool', requerido, min, max, opciones, largo } }
 * Devuelve el objeto limpio o lanza 422 con la lista de errores.
 */
export function validar(datos, reglas, { parcial = false } = {}) {
  const limpio = {}
  const errores = []
  const d = datos ?? {}
  for (const [campo, r] of Object.entries(reglas)) {
    let v = d[campo]
    const nombre = r.nombre ?? campo
    if (v === undefined || v === null || v === '') {
      if (r.requerido && !parcial) errores.push(`Falta «${nombre}».`)
      else if (v !== undefined && !parcial) limpio[campo] = r.defecto ?? (r.tipo === 'texto' ? '' : null)
      else if (r.defecto !== undefined && !parcial) limpio[campo] = r.defecto
      continue
    }
    switch (r.tipo) {
      case 'texto':
        v = String(v).trim()
        if (r.largo && v.length > r.largo) errores.push(`«${nombre}» es demasiado largo (máx. ${r.largo}).`)
        break
      case 'numero':
      case 'entero':
        v = Number(String(v).replace(',', '.'))
        if (!Number.isFinite(v)) errores.push(`«${nombre}» debe ser un número.`)
        else if (r.tipo === 'entero' && !Number.isInteger(v)) errores.push(`«${nombre}» debe ser un número entero.`)
        else if (r.min != null && v < r.min) errores.push(`«${nombre}» debe ser al menos ${r.min}.`)
        else if (r.max != null && v > r.max) errores.push(`«${nombre}» debe ser como máximo ${r.max}.`)
        break
      case 'fecha':
        if (!FECHA.test(String(v))) errores.push(`«${nombre}» debe tener formato AAAA-MM-DD.`)
        break
      case 'mes':
        if (!MES.test(String(v))) errores.push(`«${nombre}» debe tener formato AAAA-MM.`)
        break
      case 'bool':
        v = v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0
        break
      default:
        break
    }
    if (r.opciones && !r.opciones.includes(v)) errores.push(`«${nombre}» no es válido.`)
    limpio[campo] = v
  }
  if (errores.length) throw invalido(errores[0], errores)
  return limpio
}

/** Siguiente código correlativo: PRO-2026-0001 */
export function siguienteCodigo(db, tabla, prefijo, anio) {
  const base = `${prefijo}-${anio}-`
  const fila = db.prepare(`SELECT codigo FROM ${tabla} WHERE codigo LIKE ? ORDER BY codigo DESC LIMIT 1`).get(`${base}%`)
  const n = fila ? Number(fila.codigo.slice(base.length)) + 1 : 1
  return `${base}${String(n).padStart(4, '0')}`
}

/** CSV con «;» y BOM para que Excel en español lo abra bien. */
export function aCSV(filas, columnas) {
  const esc = (v) => {
    const s = v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const cab = columnas.map((c) => esc(c.titulo)).join(';')
  const cuerpo = filas.map((f) => columnas.map((c) => esc(c.valor(f))).join(';')).join('\r\n')
  return `﻿${cab}\r\n${cuerpo}\r\n`
}

export function enviarCSV(res, nombre, contenido) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`)
  res.send(contenido)
}

export function registrar(db, usuarioId, accion, detalle = '') {
  db.prepare('INSERT INTO bitacora (usuario_id, accion, detalle) VALUES (?, ?, ?)').run(usuarioId ?? null, accion, String(detalle).slice(0, 500))
}
