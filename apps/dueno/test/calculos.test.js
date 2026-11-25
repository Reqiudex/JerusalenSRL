import { describe, expect, it } from 'vitest'
import { deCadaDiez, nivelMerma, saludo, textoCompra, textoVariacion, textosVoz } from '../src/calculos.js'
import { resumenDemo } from '../src/datosDemo.js'

describe('panel del dueño', () => {
  it('saludo según la hora', () => {
    expect(saludo(8)).toBe('Buenos días')
    expect(saludo(15)).toBe('Buenas tardes')
    expect(saludo(21)).toBe('Buenas noches')
  })
  it('variación contra el mes anterior en palabras', () => {
    expect(textoVariacion(12.4, '2026-11')).toEqual({ texto: '12 % más que octubre', sube: true })
    expect(textoVariacion(-5, '2026-01')).toEqual({ texto: '5 % menos que diciembre', sube: false })
    expect(textoVariacion(null, '2026-11')).toBeNull()
  })
  it('interpreta merma y conversión', () => {
    expect(nivelMerma(5).texto).toBe('Normal')
    expect(nivelMerma(9).nivel).toBe('alerta')
    expect(nivelMerma(15).nivel).toBe('peligro')
    expect(deCadaDiez(48)).toBe('De cada 10, cierra 5')
    expect(textoCompra({ comprar: 22, unidad: 'planchas', material: 'Sinterizada' })).toBe('22 planchas de Sinterizada')
  })
  it('el modo demo respeta el contrato de la API y arma los textos de voz', () => {
    const d = resumenDemo('2026-11', null)
    for (const k of ['mes', 'sucursales', 'ingresos', 'gastos', 'resultado', 'produccion', 'mermas', 'compras', 'vendedores', 'porCobrar', 'pendientes']) expect(d).toHaveProperty(k)
    expect(d.resultado.total).toBeCloseTo(d.ingresos.total - d.gastos.total, 1)
    const voz = textosVoz(d)
    expect(voz.gane).toMatch(/^En noviembre vendió \d+ bolivianos/)
    expect(Object.keys(voz)).toHaveLength(7)
    const s = resumenDemo('2026-11', 2)
    expect(s.sucursal.id).toBe(2)
    expect(s.ingresos.total).toBeLessThan(d.ingresos.total)
  })
})
