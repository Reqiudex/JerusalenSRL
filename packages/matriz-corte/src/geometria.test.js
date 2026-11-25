import { describe, expect, it } from 'vitest'
import {
  actualizarPlancha,
  agregarCorte,
  area,
  buscarPadre,
  cargarDatos,
  confirmar,
  contiene,
  corteEnCelda,
  crearHistorial,
  deshacer,
  editarCorte,
  eliminarCorte,
  exportarDatos,
  formatearM2,
  formatearMedidas,
  formatearNumero,
  formatearPorcentaje,
  idsDescendientes,
  rectDesdeCeldas,
  rehacer,
  resumen,
  retazosParaInventario,
  seSuperponen,
  validarCorte,
} from './geometria.js'

const plancha = { id: 'P-1', codigo: 'GR-001', ancho: 300, alto: 170, material: 'Granito Negro', espesor: 2 }
const vacio = () => ({ plancha: { ...plancha }, cortes: [] })

/** Agrega varios cortes y falla la prueba si alguno no entra. */
function con(estado, ...lista) {
  let e = estado
  for (const [id, x, y, w, h, tipo] of lista) {
    const r = agregarCorte(e, { x, y, w, h }, tipo, { id })
    if (!r.ok) throw new Error(`No se pudo agregar ${id}: ${r.error}`)
    e = r.estado
  }
  return e
}

describe('rectángulos', () => {
  it('arma el rectángulo desde dos celdas en cualquier orden', () => {
    expect(rectDesdeCeldas({ x: 10, y: 5 }, { x: 2, y: 8 })).toEqual({ x: 2, y: 5, w: 9, h: 4 })
    expect(rectDesdeCeldas({ x: 3, y: 3 }, { x: 3, y: 3 })).toEqual({ x: 3, y: 3, w: 1, h: 1 })
  })

  it('calcula el área en cm²', () => {
    expect(area({ x: 0, y: 0, w: 300, h: 170 })).toBe(51000)
  })

  it('detecta superposición', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 }
    expect(seSuperponen(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true)
    expect(seSuperponen(a, { x: 2, y: 2, w: 2, h: 2 })).toBe(true) // uno dentro del otro
    expect(seSuperponen(a, { x: 9, y: 9, w: 1, h: 1 })).toBe(true) // última celda
  })

  it('compartir un borde no es superponerse', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 }
    expect(seSuperponen(a, { x: 10, y: 0, w: 5, h: 10 })).toBe(false)
    expect(seSuperponen(a, { x: 0, y: 10, w: 10, h: 5 })).toBe(false)
    expect(seSuperponen(a, { x: 10, y: 10, w: 1, h: 1 })).toBe(false) // solo una esquina
  })

  it('sabe si un rectángulo contiene a otro', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 }
    expect(contiene(a, { x: 0, y: 0, w: 10, h: 10 })).toBe(true)
    expect(contiene(a, { x: 5, y: 5, w: 6, h: 2 })).toBe(false)
  })
})

describe('validar cortes', () => {
  it('rechaza cortes fuera de la plancha', () => {
    const e = vacio()
    expect(validarCorte(e, { x: 250, y: 0, w: 51, h: 10 }).ok).toBe(false)
    expect(validarCorte(e, { x: -1, y: 0, w: 5, h: 5 }).ok).toBe(false)
    expect(validarCorte(e, { x: 0, y: 160, w: 5, h: 11 }).ok).toBe(false)
    expect(validarCorte(e, { x: 250, y: 160, w: 50, h: 10 }).ok).toBe(true)
  })

  it('rechaza medidas no enteras o en cero', () => {
    const e = vacio()
    expect(validarCorte(e, { x: 0, y: 0, w: 0, h: 5 }).ok).toBe(false)
    expect(validarCorte(e, { x: 0.5, y: 0, w: 5, h: 5 }).ok).toBe(false)
  })

  it('rechaza superposición con otro corte', () => {
    const e = con(vacio(), ['a', 0, 0, 100, 60, 'vendido'])
    const v = validarCorte(e, { x: 90, y: 50, w: 20, h: 20 })
    expect(v.ok).toBe(false)
    expect(v.conflictoId).toBe('a')
    expect(validarCorte(e, { x: 100, y: 0, w: 20, h: 20 }).ok).toBe(true)
  })

  it('no permite cortar dentro de un vendido ni de una merma', () => {
    const e = con(vacio(), ['v', 0, 0, 50, 50, 'vendido'], ['m', 60, 0, 50, 50, 'merma'])
    expect(validarCorte(e, { x: 10, y: 10, w: 5, h: 5 }).ok).toBe(false)
    expect(validarCorte(e, { x: 70, y: 10, w: 5, h: 5 }).ok).toBe(false)
  })

  it('un corte dentro de un retazo útil se vuelve su hijo', () => {
    const e = con(vacio(), ['r', 0, 0, 100, 80, 'retazo'])
    const v = validarCorte(e, { x: 10, y: 10, w: 40, h: 30 })
    expect(v).toEqual({ ok: true, padreId: 'r' })
    const r = agregarCorte(e, { x: 10, y: 10, w: 40, h: 30 }, 'vendido', { id: 'h' })
    expect(r.corte.padreId).toBe('r')
  })

  it('un corte que se sale a medias de un retazo no es válido', () => {
    const e = con(vacio(), ['r', 0, 0, 100, 80, 'retazo'])
    expect(validarCorte(e, { x: 90, y: 10, w: 20, h: 10 }).ok).toBe(false)
  })

  it('los hermanos dentro de un retazo no se pueden superponer', () => {
    const e = con(vacio(), ['r', 0, 0, 100, 80, 'retazo'], ['h1', 0, 0, 50, 40, 'vendido'])
    expect(validarCorte(e, { x: 40, y: 30, w: 20, h: 20 }).ok).toBe(false)
    expect(validarCorte(e, { x: 50, y: 0, w: 50, h: 40 }).ok).toBe(true)
  })

  it('busca el retazo más interno (retazo dentro de retazo)', () => {
    const e = con(vacio(), ['r', 0, 0, 100, 80, 'retazo'], ['r2', 10, 10, 50, 40, 'retazo'])
    expect(e.cortes.find((c) => c.id === 'r2').padreId).toBe('r')
    expect(buscarPadre(e.cortes, { x: 20, y: 20, w: 5, h: 5 }).id).toBe('r2')
    const e2 = con(e, ['n', 20, 20, 5, 5, 'merma'])
    expect(e2.cortes.find((c) => c.id === 'n').padreId).toBe('r2')
  })

  it('encuentra el corte más interno en una celda', () => {
    const e = con(vacio(), ['r', 0, 0, 100, 80, 'retazo'], ['h', 10, 10, 10, 10, 'vendido'])
    expect(corteEnCelda(e.cortes, { x: 15, y: 15 }).id).toBe('h')
    expect(corteEnCelda(e.cortes, { x: 50, y: 50 }).id).toBe('r')
    expect(corteEnCelda(e.cortes, { x: 200, y: 100 })).toBeNull()
  })
})

describe('áreas y porcentajes', () => {
  it('plancha vacía: todo libre', () => {
    const s = resumen(vacio())
    expect(s.totalCm2).toBe(51000)
    expect(s.totalM2).toBeCloseTo(5.1)
    expect(s.libre.porcentaje).toBe(100)
    expect(s.vendido.cm2).toBe(0)
  })

  it('suma áreas por tipo y calcula porcentajes', () => {
    const e = con(
      vacio(),
      ['v', 0, 0, 150, 170, 'vendido'], // 25.500 cm² = 50 %
      ['r', 150, 0, 100, 102, 'retazo'], // 10.200 cm² = 20 %
      ['m', 250, 0, 50, 51, 'merma'], // 2.550 cm² = 5 %
    )
    const s = resumen(e)
    expect(s.vendido.cm2).toBe(25500)
    expect(s.vendido.m2).toBeCloseTo(2.55)
    expect(s.vendido.porcentaje).toBeCloseTo(50)
    expect(s.retazo.porcentaje).toBeCloseTo(20)
    expect(s.merma.porcentaje).toBeCloseTo(5)
    expect(s.libre.porcentaje).toBeCloseTo(25)
    expect(s.libre.cm2).toBe(51000 - 25500 - 10200 - 2550)
    // Aprovechamiento = vendido / cortado = 25.500 / 38.250
    expect(s.aprovechamiento).toBeCloseTo((25500 / 38250) * 100)
  })

  it('un retazo recortado solo cuenta como retazo lo que le queda', () => {
    const e = con(
      vacio(),
      ['r', 0, 0, 100, 100, 'retazo'], // 10.000
      ['h1', 0, 0, 60, 50, 'vendido'], // 3.000
      ['h2', 60, 0, 40, 10, 'merma'], // 400
      ['r2', 0, 50, 50, 50, 'retazo'], // 2.500, con un hijo
      ['n', 0, 50, 10, 10, 'vendido'], // 100
    )
    const s = resumen(e)
    expect(s.vendido.cm2).toBe(3100)
    expect(s.merma.cm2).toBe(400)
    expect(s.retazo.cm2).toBe(10000 - 3000 - 400 - 2500 + (2500 - 100))
    expect(s.libre.cm2).toBe(51000 - 10000)
    const sumaPct = s.vendido.porcentaje + s.retazo.porcentaje + s.merma.porcentaje + s.libre.porcentaje
    expect(sumaPct).toBeCloseTo(100, 10)
  })

  it('los porcentajes suman 100 con una plancha de otro tamaño', () => {
    let e = vacio()
    e = actualizarPlancha(e, { ancho: 321, alto: 187 }).estado
    e = con(e, ['a', 0, 0, 17, 33, 'vendido'], ['b', 17, 0, 101, 7, 'merma'], ['c', 200, 100, 121, 87, 'retazo'])
    const s = resumen(e)
    const suma = s.vendido.porcentaje + s.retazo.porcentaje + s.merma.porcentaje + s.libre.porcentaje
    expect(suma).toBeCloseTo(100, 10)
    expect(s.totalCm2).toBe(321 * 187)
  })
})

describe('editar, eliminar y plancha', () => {
  it('no deja cambiar el tipo de un retazo con piezas adentro', () => {
    const e = con(vacio(), ['r', 0, 0, 100, 80, 'retazo'], ['h', 0, 0, 10, 10, 'vendido'])
    expect(editarCorte(e, 'r', { tipo: 'merma' }).ok).toBe(false)
    expect(editarCorte(e, 'h', { tipo: 'merma', nota: 'roto' }).estado.cortes[1]).toMatchObject({
      tipo: 'merma',
      nota: 'roto',
    })
  })

  it('eliminar un retazo elimina sus piezas', () => {
    const e = con(
      vacio(),
      ['r', 0, 0, 100, 80, 'retazo'],
      ['r2', 0, 0, 50, 40, 'retazo'],
      ['n', 0, 0, 5, 5, 'vendido'],
      ['otro', 200, 0, 10, 10, 'merma'],
    )
    expect([...idsDescendientes(e.cortes, 'r')].sort()).toEqual(['n', 'r', 'r2'])
    const r = eliminarCorte(e, 'r')
    expect(r.eliminados).toBe(3)
    expect(r.estado.cortes.map((c) => c.id)).toEqual(['otro'])
  })

  it('no deja achicar la plancha si quedan cortes afuera', () => {
    const e = con(vacio(), ['a', 250, 0, 50, 10, 'vendido'])
    expect(actualizarPlancha(e, { ancho: 280 }).ok).toBe(false)
    expect(actualizarPlancha(e, { ancho: 300, material: 'Mármol' }).ok).toBe(true)
    expect(actualizarPlancha(e, { ancho: 0 }).ok).toBe(false)
    expect(actualizarPlancha(e, { ancho: 12.5 }).ok).toBe(false)
  })
})

describe('deshacer y rehacer', () => {
  it('recorre el historial', () => {
    const e0 = vacio()
    const e1 = con(e0, ['a', 0, 0, 10, 10, 'vendido'])
    const e2 = con(e1, ['b', 20, 0, 10, 10, 'merma'])
    let h = crearHistorial(e0)
    h = confirmar(h, e1)
    h = confirmar(h, e2)
    h = deshacer(h)
    expect(h.presente).toBe(e1)
    h = deshacer(h)
    expect(h.presente).toBe(e0)
    expect(deshacer(h)).toBe(h) // no hay más
    h = rehacer(h)
    expect(h.presente).toBe(e1)
    h = confirmar(h, e2)
    expect(h.futuro).toEqual([]) // una acción nueva borra lo rehacible
  })
})

describe('JSON', () => {
  it('exporta y vuelve a cargar lo mismo', () => {
    const e = con(vacio(), ['r', 0, 0, 100, 80, 'retazo'], ['h', 0, 0, 10, 10, 'vendido'])
    const json = JSON.parse(JSON.stringify(exportarDatos(e)))
    expect(json.plancha).toEqual({ id: 'P-1', ancho: 300, alto: 170, material: 'Granito Negro', espesor: 2, codigo: 'GR-001' })
    expect(json.cortes[1]).toEqual({ id: 'h', x: 0, y: 0, w: 10, h: 10, tipo: 'vendido', nota: '', padreId: 'r' })
    expect(json.cortes[0].padreId).toBeUndefined()
    const r = cargarDatos(json)
    expect(r.ok).toBe(true)
    expect(exportarDatos(r.estado)).toEqual(json)
  })

  it('rechaza datos con errores', () => {
    const base = { plancha: { id: 1, ancho: 300, alto: 170, material: 'X', espesor: 2 } }
    expect(cargarDatos(null).ok).toBe(false)
    expect(cargarDatos({ ...base, cortes: [{ id: 'a', x: 290, y: 0, w: 20, h: 5, tipo: 'vendido' }] }).ok).toBe(false)
    expect(cargarDatos({ ...base, cortes: [{ id: 'a', x: 0, y: 0, w: 5, h: 5, tipo: 'otro' }] }).ok).toBe(false)
    expect(
      cargarDatos({
        ...base,
        cortes: [
          { id: 'a', x: 0, y: 0, w: 10, h: 10, tipo: 'vendido' },
          { id: 'b', x: 5, y: 5, w: 10, h: 10, tipo: 'merma' },
        ],
      }).ok,
    ).toBe(false)
    expect(
      cargarDatos({
        ...base,
        cortes: [
          { id: 'a', x: 0, y: 0, w: 10, h: 10, tipo: 'vendido' },
          { id: 'b', x: 1, y: 1, w: 2, h: 2, tipo: 'merma', padreId: 'a' }, // padre no es retazo
        ],
      }).ok,
    ).toBe(false)
  })

  it('lista los retazos para el inventario', () => {
    const e = con(vacio(), ['r', 0, 0, 100, 80, 'retazo'], ['h', 0, 0, 50, 80, 'vendido'], ['r3', 200, 0, 40, 30, 'retazo'])
    const lista = retazosParaInventario(e)
    expect(lista).toHaveLength(2)
    expect(lista[0]).toMatchObject({ id: 'r', ancho: 100, alto: 80, recortado: true, material: 'Granito Negro' })
    expect(lista[0].libreM2).toBeCloseTo(0.4)
    expect(lista[1]).toMatchObject({ id: 'r3', recortado: false })
    expect(lista[1].m2).toBeCloseTo(0.12)
  })
})

describe('formatos', () => {
  it('usa coma decimal y punto de miles', () => {
    expect(formatearNumero(1234567.891)).toBe('1.234.567,89')
    expect(formatearNumero(0.5, 1)).toBe('0,5')
    expect(formatearNumero(-3.2)).toBe('-3,20')
    expect(formatearNumero(-0.001)).toBe('0,00')
    expect(formatearM2(51000)).toBe('5,10 m²')
    expect(formatearPorcentaje(12.345)).toBe('12,3 %')
    expect(formatearMedidas({ w: 120, h: 80 })).toBe('120 × 80 cm (1,20 × 0,80 m)')
  })
})
