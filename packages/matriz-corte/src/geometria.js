/**
 * Lógica pura de la Matriz de corte de planchas.
 *
 * No depende de React ni del navegador: se puede usar en el front,
 * en la API (Node) y en las pruebas.
 *
 * Unidades: la plancha es una cuadrícula de `ancho × alto` cuadros y
 * 1 cuadro = 1 cm. Por eso el área de un rectángulo en cuadros es
 * directamente su área en cm², y 10.000 cm² = 1 m².
 *
 * Un corte es { id, x, y, w, h, tipo, nota, padreId? }:
 *   - (x, y) es la esquina superior izquierda (en cuadros, desde 0).
 *   - w y h son el ancho y el alto (en cuadros, al menos 1).
 *   - padreId apunta a un «retazo útil» que contiene por completo a este corte
 *     (el retazo se volvió a cortar en piezas más chicas).
 */

export const CM2_POR_M2 = 10000

export const TIPOS = Object.freeze({
  vendido: { clave: 'vendido', nombre: 'Vendido / Usado', corto: 'Vendido' },
  retazo: { clave: 'retazo', nombre: 'Retazo útil', corto: 'Retazo' },
  merma: { clave: 'merma', nombre: 'Merma / Desperdicio', corto: 'Merma' },
})

export const LISTA_TIPOS = ['vendido', 'retazo', 'merma']

export const PLANCHA_POR_DEFECTO = Object.freeze({
  id: '',
  codigo: '',
  ancho: 300,
  alto: 170,
  material: '',
  espesor: 2,
})

/** Límites razonables para que la cuadrícula siga siendo manejable. */
export const LIMITES = Object.freeze({ minLado: 1, maxLado: 2000 })

// ───────────────────────── Rectángulos ─────────────────────────

/** Rectángulo a partir de dos celdas (ambas incluidas), en cualquier orden. */
export function rectDesdeCeldas(a, b) {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 }
}

/** Área en cm² (= cuadros). */
export function area(r) {
  return r.w * r.h
}

export function cm2AM2(cm2) {
  return cm2 / CM2_POR_M2
}

/**
 * ¿Se superponen dos rectángulos? Compartir solo un borde NO cuenta como
 * superposición (dos piezas pueden quedar pegadas una a la otra).
 */
export function seSuperponen(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** ¿`exterior` contiene por completo a `interior`? (bordes incluidos) */
export function contiene(exterior, interior) {
  return (
    interior.x >= exterior.x &&
    interior.y >= exterior.y &&
    interior.x + interior.w <= exterior.x + exterior.w &&
    interior.y + interior.h <= exterior.y + exterior.h
  )
}

/** ¿El rectángulo tiene medidas enteras y positivas? */
export function esRectValido(r) {
  return (
    r != null &&
    [r.x, r.y, r.w, r.h].every(Number.isInteger) &&
    r.w >= 1 &&
    r.h >= 1
  )
}

/** ¿El rectángulo queda completamente dentro de la plancha? */
export function dentroDePlancha(r, plancha) {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= plancha.ancho && r.y + r.h <= plancha.alto
}

/** Celda (x, y) dentro de la plancha, recortando valores fuera de rango. */
export function limitarCelda(c, plancha) {
  return {
    x: Math.min(plancha.ancho - 1, Math.max(0, Math.floor(c.x))),
    y: Math.min(plancha.alto - 1, Math.max(0, Math.floor(c.y))),
  }
}

// ───────────────────────── Jerarquía ─────────────────────────

export function indexarPorId(cortes) {
  const mapa = new Map()
  for (const c of cortes) mapa.set(c.id, c)
  return mapa
}

/** Hijos directos de un corte. */
export function hijosDe(cortes, id) {
  return cortes.filter((c) => c.padreId === id)
}

/** Ids del corte y de todos sus descendientes. */
export function idsDescendientes(cortes, id) {
  const resultado = new Set([id])
  let agregado = true
  while (agregado) {
    agregado = false
    for (const c of cortes) {
      if (c.padreId != null && resultado.has(c.padreId) && !resultado.has(c.id)) {
        resultado.add(c.id)
        agregado = true
      }
    }
  }
  return resultado
}

/** Cadena de ancestros (del padre directo hacia arriba). */
export function ancestros(cortes, corte) {
  const porId = indexarPorId(cortes)
  const cadena = []
  const vistos = new Set()
  let actual = corte.padreId != null ? porId.get(corte.padreId) : undefined
  while (actual && !vistos.has(actual.id)) {
    cadena.push(actual)
    vistos.add(actual.id)
    actual = actual.padreId != null ? porId.get(actual.padreId) : undefined
  }
  return cadena
}

/** Profundidad: 0 para cortes sobre la plancha, 1 para hijos de un retazo, etc. */
export function profundidad(cortes, corte) {
  return ancestros(cortes, corte).length
}

/**
 * Retazo útil más interno que contiene por completo al rectángulo, o null.
 * Se ignoran los ids indicados (por ejemplo, el propio corte al editarlo).
 */
export function buscarPadre(cortes, r, ignorar = new Set()) {
  let mejor = null
  for (const c of cortes) {
    if (ignorar.has(c.id) || c.tipo !== 'retazo') continue
    if (!contiene(c, r)) continue
    if (!mejor || area(c) < area(mejor)) mejor = c
  }
  return mejor
}

/** Corte más interno que ocupa la celda (x, y), o null. */
export function corteEnCelda(cortes, celda) {
  let mejor = null
  let mejorProf = -1
  for (const c of cortes) {
    if (celda.x >= c.x && celda.x < c.x + c.w && celda.y >= c.y && celda.y < c.y + c.h) {
      const p = profundidad(cortes, c)
      if (p > mejorProf) {
        mejor = c
        mejorProf = p
      }
    }
  }
  return mejor
}

// ───────────────────────── Validación de un corte nuevo ─────────────────────────

/**
 * Valida si el rectángulo se puede agregar.
 *
 * Reglas:
 *  1. Medidas enteras y positivas, dentro de la plancha.
 *  2. Si cae completamente dentro de un retazo útil, pasa a ser hijo de ese
 *     retazo (el más interno).
 *  3. No puede superponerse con ningún otro corte, salvo con sus ancestros.
 *
 * Devuelve { ok: true, padreId } o { ok: false, error }.
 */
export function validarCorte(estado, r, opciones = {}) {
  const { plancha, cortes } = estado
  const ignorar = opciones.ignorar ?? new Set()

  if (!esRectValido(r)) return { ok: false, error: 'Las medidas deben ser números enteros mayores que cero.' }
  if (!dentroDePlancha(r, plancha)) return { ok: false, error: 'El corte se sale de la plancha.' }

  const padre = buscarPadre(cortes, r, ignorar)
  const permitidos = new Set()
  if (padre) {
    permitidos.add(padre.id)
    for (const a of ancestros(cortes, padre)) permitidos.add(a.id)
  }

  for (const c of cortes) {
    if (ignorar.has(c.id) || permitidos.has(c.id)) continue
    if (seSuperponen(c, r)) {
      return {
        ok: false,
        error:
          c.tipo === 'retazo'
            ? 'Se superpone con un retazo útil. Para recortarlo, dibuja el corte completamente dentro del retazo.'
            : `Se superpone con otro corte (${TIPOS[c.tipo]?.corto ?? c.tipo}).`,
        conflictoId: c.id,
      }
    }
  }
  return { ok: true, padreId: padre ? padre.id : null }
}

// ───────────────────────── Operaciones sobre el estado ─────────────────────────
// Todas devuelven { ok, estado } o { ok: false, error } sin modificar la entrada.

let contadorIds = 0
/** Id corto y único para un corte nuevo. */
export function generarId() {
  contadorIds += 1
  const azar = Math.random().toString(36).slice(2, 7)
  return `c-${Date.now().toString(36)}-${contadorIds.toString(36)}${azar}`
}

export function agregarCorte(estado, r, tipo, opciones = {}) {
  if (!TIPOS[tipo]) return { ok: false, error: 'Tipo de corte desconocido.' }
  const v = validarCorte(estado, r)
  if (!v.ok) return v
  const corte = {
    id: opciones.id ?? generarId(),
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    tipo,
    nota: opciones.nota ?? '',
  }
  if (v.padreId != null) corte.padreId = v.padreId
  return { ok: true, estado: { ...estado, cortes: [...estado.cortes, corte] }, corte }
}

/** Cambia tipo y/o nota de un corte. */
export function editarCorte(estado, id, cambios) {
  const corte = estado.cortes.find((c) => c.id === id)
  if (!corte) return { ok: false, error: 'No se encontró el corte.' }
  if (cambios.tipo != null) {
    if (!TIPOS[cambios.tipo]) return { ok: false, error: 'Tipo de corte desconocido.' }
    if (cambios.tipo !== 'retazo' && hijosDe(estado.cortes, id).length > 0) {
      return {
        ok: false,
        error: 'Este retazo ya tiene piezas cortadas adentro. Elimina esas piezas antes de cambiarle el tipo.',
      }
    }
  }
  const actualizado = { ...corte }
  if (cambios.tipo != null) actualizado.tipo = cambios.tipo
  if (cambios.nota != null) actualizado.nota = String(cambios.nota)
  return {
    ok: true,
    estado: { ...estado, cortes: estado.cortes.map((c) => (c.id === id ? actualizado : c)) },
  }
}

/** Elimina un corte y todas las piezas que tenga adentro. */
export function eliminarCorte(estado, id) {
  if (!estado.cortes.some((c) => c.id === id)) return { ok: false, error: 'No se encontró el corte.' }
  const quitar = idsDescendientes(estado.cortes, id)
  return {
    ok: true,
    estado: { ...estado, cortes: estado.cortes.filter((c) => !quitar.has(c.id)) },
    eliminados: quitar.size,
  }
}

/** Cambia los datos de la plancha. Si cambia el tamaño, todos los cortes deben seguir cabiendo. */
export function actualizarPlancha(estado, cambios) {
  const plancha = { ...estado.plancha, ...cambios }
  for (const lado of ['ancho', 'alto']) {
    const v = plancha[lado]
    if (!Number.isInteger(v) || v < LIMITES.minLado || v > LIMITES.maxLado) {
      return {
        ok: false,
        error: `El ${lado} debe ser un número entero entre ${LIMITES.minLado} y ${LIMITES.maxLado} cuadros.`,
      }
    }
  }
  const fuera = estado.cortes.filter((c) => !dentroDePlancha(c, plancha))
  if (fuera.length > 0) {
    return {
      ok: false,
      error: `Con ese tamaño ${fuera.length === 1 ? 'queda 1 corte' : `quedan ${fuera.length} cortes`} fuera de la plancha. Achícalos o elimínalos primero.`,
    }
  }
  return { ok: true, estado: { ...estado, plancha } }
}

// ───────────────────────── Resumen ─────────────────────────

/**
 * Áreas efectivas de cada tipo y de la parte libre.
 *
 * Un retazo útil que fue recortado solo cuenta como retazo la parte que le
 * quedó libre; cada pieza hija cuenta según su propio tipo. Así la suma de
 * vendido + retazo + merma + libre es siempre el área de la plancha (100 %).
 */
export function resumen(estado) {
  const { plancha, cortes } = estado
  const total = plancha.ancho * plancha.alto
  const cm2 = { vendido: 0, retazo: 0, merma: 0, libre: total }
  const conteo = { vendido: 0, retazo: 0, merma: 0 }

  const areaHijos = new Map()
  for (const c of cortes) {
    if (c.padreId != null) areaHijos.set(c.padreId, (areaHijos.get(c.padreId) ?? 0) + area(c))
  }
  for (const c of cortes) {
    if (!TIPOS[c.tipo]) continue
    cm2[c.tipo] += area(c) - (areaHijos.get(c.id) ?? 0)
    conteo[c.tipo] += 1
    if (c.padreId == null) cm2.libre -= area(c)
  }

  const fila = (clave) => ({
    cm2: cm2[clave],
    m2: cm2AM2(cm2[clave]),
    porcentaje: total > 0 ? (cm2[clave] / total) * 100 : 0,
  })
  return {
    totalCm2: total,
    totalM2: cm2AM2(total),
    vendido: { ...fila('vendido'), cantidad: conteo.vendido },
    retazo: { ...fila('retazo'), cantidad: conteo.retazo },
    merma: { ...fila('merma'), cantidad: conteo.merma },
    libre: fila('libre'),
    /** Aprovechamiento: lo vendido sobre lo ya cortado (sin contar lo libre). */
    aprovechamiento:
      total - cm2.libre > 0 ? (cm2.vendido / (total - cm2.libre)) * 100 : 0,
  }
}

/**
 * Retazos útiles para el inventario: cada retazo con sus medidas, cuánto le
 * queda libre y si ya fue recortado.
 */
export function retazosParaInventario(estado) {
  const { plancha, cortes } = estado
  return cortes
    .filter((c) => c.tipo === 'retazo')
    .map((c) => {
      const hijos = hijosDe(cortes, c.id)
      const libreCm2 = area(c) - hijos.reduce((s, h) => s + area(h), 0)
      return {
        id: c.id,
        planchaId: plancha.id,
        material: plancha.material,
        espesor: plancha.espesor,
        ancho: c.w,
        alto: c.h,
        x: c.x,
        y: c.y,
        m2: cm2AM2(area(c)),
        libreM2: cm2AM2(libreCm2),
        recortado: hijos.length > 0,
        padreId: c.padreId ?? null,
        nota: c.nota ?? '',
      }
    })
}

// ───────────────────────── Deshacer / rehacer ─────────────────────────

export const MAX_HISTORIAL = 200

export function crearHistorial(presente) {
  return { pasado: [], presente, futuro: [] }
}

export function confirmar(historial, nuevo) {
  if (nuevo === historial.presente) return historial
  const pasado = [...historial.pasado, historial.presente]
  if (pasado.length > MAX_HISTORIAL) pasado.shift()
  return { pasado, presente: nuevo, futuro: [] }
}

export function deshacer(historial) {
  if (historial.pasado.length === 0) return historial
  const pasado = historial.pasado.slice(0, -1)
  return {
    pasado,
    presente: historial.pasado[historial.pasado.length - 1],
    futuro: [historial.presente, ...historial.futuro],
  }
}

export function rehacer(historial) {
  if (historial.futuro.length === 0) return historial
  const [siguiente, ...futuro] = historial.futuro
  return { pasado: [...historial.pasado, historial.presente], presente: siguiente, futuro }
}

// ───────────────────────── JSON (exportar / cargar) ─────────────────────────

/** Estado → JSON con la forma acordada { plancha, cortes }. */
export function exportarDatos(estado) {
  const { plancha, cortes } = estado
  const p = {
    id: plancha.id,
    ancho: plancha.ancho,
    alto: plancha.alto,
    material: plancha.material,
    espesor: plancha.espesor,
  }
  if (plancha.codigo) p.codigo = plancha.codigo
  return {
    plancha: p,
    cortes: cortes.map((c) => {
      const s = { id: c.id, x: c.x, y: c.y, w: c.w, h: c.h, tipo: c.tipo, nota: c.nota ?? '' }
      if (c.padreId != null) s.padreId = c.padreId
      return s
    }),
  }
}

/**
 * Valida y normaliza un JSON { plancha, cortes }.
 * Devuelve { ok: true, estado } o { ok: false, errores: [...] }.
 */
export function cargarDatos(datos) {
  const errores = []
  if (!datos || typeof datos !== 'object') return { ok: false, errores: ['El archivo no tiene datos válidos.'] }
  const p = datos.plancha
  if (!p || typeof p !== 'object') return { ok: false, errores: ['Falta la sección «plancha».'] }

  const plancha = {
    id: p.id ?? '',
    codigo: p.codigo ?? '',
    ancho: Number(p.ancho),
    alto: Number(p.alto),
    material: p.material ?? '',
    espesor: p.espesor ?? '',
  }
  for (const lado of ['ancho', 'alto']) {
    if (!Number.isInteger(plancha[lado]) || plancha[lado] < LIMITES.minLado || plancha[lado] > LIMITES.maxLado) {
      errores.push(`La plancha tiene un ${lado} inválido.`)
    }
  }
  if (!Array.isArray(datos.cortes)) errores.push('Falta la lista «cortes».')
  if (errores.length) return { ok: false, errores }

  const cortes = []
  const ids = new Set()
  datos.cortes.forEach((c, i) => {
    const n = i + 1
    if (!c || typeof c !== 'object') {
      errores.push(`Corte ${n}: no es un objeto.`)
      return
    }
    const corte = {
      id: c.id != null && c.id !== '' ? String(c.id) : generarId(),
      x: Number(c.x),
      y: Number(c.y),
      w: Number(c.w),
      h: Number(c.h),
      tipo: c.tipo,
      nota: c.nota != null ? String(c.nota) : '',
    }
    if (c.padreId != null && c.padreId !== '') corte.padreId = String(c.padreId)
    if (ids.has(corte.id)) errores.push(`Corte ${n}: el id «${corte.id}» está repetido.`)
    ids.add(corte.id)
    if (!TIPOS[corte.tipo]) errores.push(`Corte ${n}: tipo «${c.tipo}» desconocido.`)
    if (!esRectValido(corte)) errores.push(`Corte ${n}: medidas inválidas.`)
    else if (!dentroDePlancha(corte, plancha)) errores.push(`Corte ${n}: se sale de la plancha.`)
    cortes.push(corte)
  })
  if (errores.length) return { ok: false, errores }

  // Relación padre-hijo: el padre debe existir, ser retazo útil y contener al hijo.
  const porId = indexarPorId(cortes)
  for (const c of cortes) {
    if (c.padreId == null) continue
    const padre = porId.get(c.padreId)
    if (!padre) errores.push(`Corte «${c.id}»: su padre «${c.padreId}» no existe.`)
    else if (padre.tipo !== 'retazo') errores.push(`Corte «${c.id}»: su padre no es un retazo útil.`)
    else if (!contiene(padre, c)) errores.push(`Corte «${c.id}»: no está dentro de su retazo padre.`)
    else if (ancestros(cortes, c).some((a) => a.id === c.id)) errores.push(`Corte «${c.id}»: tiene un ciclo de padres.`)
  }
  if (errores.length) return { ok: false, errores }

  // Superposición: solo entre hermanos (mismo padre). Los hijos están dentro de su padre.
  for (let i = 0; i < cortes.length; i++) {
    for (let j = i + 1; j < cortes.length; j++) {
      const a = cortes[i]
      const b = cortes[j]
      if ((a.padreId ?? null) === (b.padreId ?? null) && seSuperponen(a, b)) {
        errores.push(`Los cortes «${a.id}» y «${b.id}» se superponen.`)
      }
    }
  }
  if (errores.length) return { ok: false, errores }
  return { ok: true, estado: { plancha, cortes } }
}

// ───────────────────────── Formatos ─────────────────────────

/** Número con coma decimal y punto de miles (formato boliviano). */
export function formatearNumero(n, decimales = 2) {
  const fijo = Math.abs(n).toFixed(decimales)
  const [entero, dec] = fijo.split('.')
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const signo = n < 0 && Number(fijo) !== 0 ? '-' : ''
  return signo + conMiles + (dec ? `,${dec}` : '')
}

export function formatearM2(cm2) {
  return `${formatearNumero(cm2AM2(cm2), 2)} m²`
}

export function formatearPorcentaje(p) {
  return `${formatearNumero(p, 1)} %`
}

/** «120 × 80 cm (1,20 × 0,80 m)» */
export function formatearMedidas(r) {
  return `${r.w} × ${r.h} cm (${formatearNumero(r.w / 100)} × ${formatearNumero(r.h / 100)} m)`
}
