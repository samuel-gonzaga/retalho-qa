import { describe, expect, it } from 'vitest'
import {
  itemTotalCents,
  rollPriceCents,
  unitPriceCents,
  validateQuantity,
  type PricedProduct,
  type Unit,
} from '@/domain/units'

const meter: PricedProduct = { unit: 'meter', priceCents: 1299, rollLengthCenti: null }
const roll5m: PricedProduct = { unit: 'roll', priceCents: 400, rollLengthCenti: 500 }
const button: PricedProduct = { unit: 'unit', priceCents: 150, rollLengthCenti: null }

function outcome(unit: Unit, quantity: unknown): number | string {
  const result = validateQuantity(unit, quantity)
  return result.ok ? result.centi : result.error
}

describe('RF-15 · quantidade do item (partições e valores limite)', () => {
  // Valor aceito = quantidade em centésimos; recusa = motivo do 422.
  it.each([
    [0, 'range', 'range'],
    [0.01, 1, 'integer'],
    [1, 100, 100],
    [2, 200, 200],
    [1.25, 125, 'integer'],
    [1.255, 'decimals', 'integer'],
    [1000, 100_000, 100_000],
    [1000.01, 'range', 'range'],
    [1001, 'range', 'range'],
  ])('quantidade %d: metro → %s; rolo e unidade → %s', (quantity, asMeter, asWhole) => {
    expect(outcome('meter', quantity)).toBe(asMeter)
    expect(outcome('roll', quantity)).toBe(asWhole)
    expect(outcome('unit', quantity)).toBe(asWhole)
  })

  it.each([[-1], [Number.NaN], [Number.POSITIVE_INFINITY], ['2'], [null], [undefined]])(
    'recusa %s como quantidade',
    (quantity) => {
      expect(outcome('meter', quantity)).toBe('range')
    },
  )
})

describe('RF-05 · preço do rolo', () => {
  it('rolo de 5 m a R$ 4,00/m custa R$ 20,00', () => {
    expect(rollPriceCents(500, 400)).toBe(2000)
  })

  it('rolo de 2,5 m a R$ 3,33/m custa R$ 8,33 (8,325 arredondado para cima)', () => {
    expect(rollPriceCents(250, 333)).toBe(833)
  })
})

describe('RF-16 · preço unitário e total do item', () => {
  it('2,35 m a R$ 12,99/m somam R$ 30,53', () => {
    expect(unitPriceCents(meter, 235)).toBe(1299)
    expect(itemTotalCents(meter, 235)).toBe(3053)
  })

  it('3 unidades a R$ 1,50 somam R$ 4,50', () => {
    expect(unitPriceCents(button, 300)).toBe(150)
    expect(itemTotalCents(button, 300)).toBe(450)
  })

  // A quantidade 1 esconde o BUG-02: dividir o preço do rolo por 1 não muda nada.
  it.each([
    [1, 2000],
    [2, 4000],
    [3, 6000],
    [4, 8000],
  ])(
    '[BUG-02] %i rolo(s) de 5 m a R$ 4,00/m: unitário R$ 20,00 e total de %i centavos',
    (rolls, total) => {
      expect(unitPriceCents(roll5m, rolls * 100)).toBe(2000)
      expect(itemTotalCents(roll5m, rolls * 100)).toBe(total)
    },
  )
})
