import { describe, expect, it } from 'vitest'
import { divRoundHalfUp, formatBRL } from '@/domain/money'
import { parseDecimalInput } from '@/domain/numbers'

describe('RF-05, RF-16, RF-18 · arredondamento meio para cima no centavo', () => {
  it.each([
    [832.5, 8325, 10, 833],
    [1.005, 1005, 1000, 1],
    [30.5265, 305265, 10000, 31],
    [0.4, 4, 10, 0],
    [0.5, 5, 10, 1],
    [6.6667, 2000, 300, 7],
  ])('%d centavos (%i ÷ %i) arredondam para %i', (_, numerator, denominator, expected) => {
    expect(divRoundHalfUp(numerator, denominator)).toBe(expected)
  })

  it('mantém a exatidão em valores grandes (sem erro de ponto flutuante)', () => {
    expect(divRoundHalfUp(9_999_999 * 100_000, 100)).toBe(9_999_999_000)
  })
})

describe('RNF-10 · formato brasileiro de dinheiro', () => {
  it.each([
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [3053, 'R$ 30,53'],
    [450000, 'R$ 4.500,00'],
    [999999999, 'R$ 9.999.999,99'],
    [-100, '-R$ 1,00'],
  ])('%i centavos são exibidos como %s', (cents, expected) => {
    expect(formatBRL(cents)).toBe(expected)
  })
})

describe('RNF-10 · campos numéricos aceitam vírgula ou ponto', () => {
  it.each([
    ['2,35', 2.35],
    ['2.35', 2.35],
    [' 10 ', 10],
    ['0,5', 0.5],
    ['1.000', 1],
  ])('"%s" vira %d', (text, expected) => {
    expect(parseDecimalInput(text)).toBe(expected)
  })

  it.each(['', 'abc', '1.000,00', '2,3,5', '-1', '1e3'])('"%s" é recusado', (text) => {
    expect(parseDecimalInput(text)).toBeNull()
  })
})
