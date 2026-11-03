import { describe, expect, it } from 'vitest'
import {
  centsToInput,
  formatDate,
  formatDateTime,
  formatInvoiceNumber,
  formatPercent,
  formatProductPrice,
  formatQuantity,
  formatUnitPrice,
  parseMoneyInput,
} from '@/domain/format'

describe('RNF-10 · quantidades com vírgula e unidade', () => {
  it.each([
    [2.35, 'meter', '2,35 m'],
    [100, 'meter', '100 m'],
    [1000, 'meter', '1.000 m'],
    [1, 'roll', '1 rolo'],
    [4, 'roll', '4 rolos'],
    [3, 'unit', '3 un'],
  ] as const)('%d em %s → %s', (quantity, unit, expected) => {
    expect(formatQuantity(quantity, unit)).toBe(expected)
  })

  it.each([
    [10, '10 %'],
    [12.5, '12,5 %'],
    [0, '0 %'],
  ])('desconto de %d → %s', (pct, expected) => {
    expect(formatPercent(pct)).toBe(expected)
  })
})

describe('RF-04 · preço com a unidade na lista de produtos', () => {
  it.each([
    [{ unit: 'meter', priceCents: 400, rollLength: null, rollPriceCents: null }, 'R$ 4,00/m'],
    [
      { unit: 'roll', priceCents: 400, rollLength: 5, rollPriceCents: 2000 },
      'R$ 20,00 o rolo de 5 m',
    ],
    [
      { unit: 'roll', priceCents: 333, rollLength: 2.5, rollPriceCents: 833 },
      'R$ 8,33 o rolo de 2,5 m',
    ],
    [{ unit: 'unit', priceCents: 150, rollLength: null, rollPriceCents: null }, 'R$ 1,50/un'],
  ] as const)('%o → %s', (product, expected) => {
    expect(formatProductPrice(product)).toBe(expected)
  })
})

describe('RF-16 · preço unitário do item', () => {
  it.each([
    [1299, 'meter', 'R$ 12,99/m'],
    [2000, 'roll', 'R$ 20,00/rolo'],
    [150, 'unit', 'R$ 1,50/un'],
  ] as const)('%i centavos em %s → %s', (cents, unit, expected) => {
    expect(formatUnitPrice(cents, unit)).toBe(expected)
  })
})

describe('RNF-10 · datas no fuso de Brasília', () => {
  it('formata data e hora como dd/mm/aaaa', () => {
    expect(formatDate('2026-11-03T02:30:00.000Z')).toBe('02/11/2026')
    expect(formatDateTime('2026-11-03T15:05:00.000Z')).toBe('03/11/2026 12:05')
  })
})

describe('RF-32 · número da nota com quatro dígitos', () => {
  it.each([
    [1, 'NI 0001'],
    [42, 'NI 0042'],
    [12345, 'NI 12345'],
  ])('%i → %s', (number, expected) => {
    expect(formatInvoiceNumber(number)).toBe(expected)
  })
})

describe('RNF-10 · valores em reais digitados com vírgula ou ponto', () => {
  it.each([
    ['49,90', 4990],
    ['49.9', 4990],
    ['0', 0],
    ['100', 10_000],
    ['1,999', null],
    ['R$ 10', null],
    ['', null],
  ])('"%s" → %s centavos', (text, expected) => {
    expect(parseMoneyInput(text)).toBe(expected)
  })

  it('preenche campos de valor com vírgula', () => {
    expect(centsToInput(20_000)).toBe('200,00')
    expect(centsToInput(5)).toBe('0,05')
  })
})
