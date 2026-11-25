import { describe, expect, it } from 'vitest'
import { bsParaVoz, formatearBs, formatearBsCorto, formatearFecha, formatearMes, formatearNumero, formatearPorcentaje, sumarMes } from '../src/formatos.js'

describe('formatos bolivianos', () => {
  it('números y Bs', () => {
    expect(formatearNumero(1234567.891)).toBe('1.234.567,89')
    expect(formatearNumero(-5, 0)).toBe('−5')
    expect(formatearNumero(NaN)).toBe('—')
    expect(formatearBs(54000)).toBe('Bs 54.000,00')
    expect(formatearBs(1234.5, { entero: true })).toBe('Bs 1.235')
    expect(formatearBsCorto(345600)).toBe('Bs 346 mil')
    expect(formatearBsCorto(12345)).toBe('Bs 12,3 mil')
    expect(formatearBsCorto(1250000)).toBe('Bs 1,3 M')
    expect(formatearPorcentaje(48.25)).toBe('48,3 %')
  })
  it('fechas y meses', () => {
    expect(formatearFecha('2026-11-25')).toBe('25/11/2026')
    expect(formatearMes('2026-11')).toBe('noviembre de 2026')
    expect(formatearMes('2026-01', { corto: true })).toBe('ene 26')
    expect(sumarMes('2026-01', -1)).toBe('2025-12')
  })
  it('texto para la voz sin separadores', () => {
    expect(bsParaVoz(12345.6)).toBe('12346 bolivianos')
    expect(bsParaVoz(-200)).toBe('menos 200 bolivianos')
  })
})
