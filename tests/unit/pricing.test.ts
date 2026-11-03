import { describe, expect, it } from 'vitest'
import {
  computeOrderTotals,
  discountCents,
  isFreeShipping,
  type PaymentMethod,
  type PricingInput,
} from '@/domain/pricing'

const LOCAL = '01000-000'
const OUTSIDE = '10000-000'

describe('RF-18 · valor do desconto global', () => {
  it.each([
    ['0 %', 500_000, 0, 0],
    ['10 %', 500_000, 1000, 50_000],
    ['12,5 %', 1000, 1250, 125],
    ['100 %', 500_000, 10_000, 500_000],
    ['10 % de R$ 10,05 (1,005 arredondado)', 1005, 1000, 101],
  ])('%s de %i centavos é %i centavos', (_, subtotal, discountBp, expected) => {
    expect(discountCents(subtotal, discountBp)).toBe(expected)
  })
})

describe('RF-20 · tabela de decisão do frete grátis', () => {
  // C1: valor líquido ≥ R$ 300,00 · C2: pagamento Pix · C3: CEP de 01000-000 a 09999-999
  it.each<[string, number, PaymentMethod, string, boolean]>([
    ['R1 (S, S, S)', 30_000, 'pix', LOCAL, true],
    ['R2 (S, S, N)', 30_000, 'pix', OUTSIDE, false],
    ['R3 (S, N, S)', 30_000, 'boleto', LOCAL, false],
    ['R4 (S, N, N)', 30_000, 'card', OUTSIDE, false],
    ['R5 (N, S, S)', 29_999, 'pix', LOCAL, false],
    ['R6 (N, S, N)', 29_999, 'pix', OUTSIDE, false],
    ['R7 (N, N, S)', 29_999, 'card', LOCAL, false],
    ['R8 (N, N, N)', 29_999, 'boleto', OUTSIDE, false],
  ])('%s → frete grátis = %s', (_, netCents, paymentMethod, cep, expected) => {
    expect(isFreeShipping({ netCents, paymentMethod, cep })).toBe(expected)
  })

  it.each([
    [29_999, false],
    [30_000, true],
    [30_001, true],
  ])('limite de valor: líquido de %i centavos → grátis = %s', (netCents, expected) => {
    expect(isFreeShipping({ netCents, paymentMethod: 'pix', cep: LOCAL })).toBe(expected)
  })

  it.each([
    ['00999-999', false],
    ['01000-000', true],
    ['09999-999', true],
    ['10000-000', false],
  ])('limite de CEP: %s → grátis = %s', (cep, expected) => {
    expect(isFreeShipping({ netCents: 30_000, paymentMethod: 'pix', cep })).toBe(expected)
  })
})

describe('RF-21 · total do pedido', () => {
  const base: PricingInput = {
    itemTotalsCents: [500_000],
    discountBp: 1000,
    freightCents: 5000,
    paymentMethod: 'pix',
    cep: LOCAL,
    installments: 1,
  }

  it('Pix e CEP local: R$ 5.000,00 com 10 % e frete de R$ 50,00 dão R$ 4.500,00', () => {
    expect(computeOrderTotals(base)).toMatchObject({
      subtotalCents: 500_000,
      discountCents: 50_000,
      netCents: 450_000,
      freeShipping: true,
      freightChargedCents: 0,
      totalCents: 450_000,
    })
  })

  it('boleto paga o frete: R$ 4.550,00', () => {
    expect(computeOrderTotals({ ...base, paymentMethod: 'boleto' })).toMatchObject({
      freeShipping: false,
      freightChargedCents: 5000,
      totalCents: 455_000,
    })
  })

  it('soma os totais de todos os itens no subtotal', () => {
    expect(computeOrderTotals({ ...base, itemTotalsCents: [3053, 8000, 450] }).subtotalCents).toBe(
      11_503,
    )
  })

  it('RF-17 · pedido sem itens cobra só o frete', () => {
    expect(computeOrderTotals({ ...base, itemTotalsCents: [] })).toMatchObject({
      subtotalCents: 0,
      netCents: 0,
      freeShipping: false,
      totalCents: 5000,
    })
  })

  it('RF-18 · desconto de 100 % zera o líquido, e o frete volta a ser cobrado', () => {
    expect(computeOrderTotals({ ...base, discountBp: 10_000 })).toMatchObject({
      netCents: 0,
      freeShipping: false,
      totalCents: 5000,
    })
  })

  it('RF-23 · inclui o plano de parcelas calculado sobre o total', () => {
    expect(computeOrderTotals({ ...base, installments: 3 }).installmentPlan).toEqual([
      { number: 1, amountCents: 150_000 },
      { number: 2, amountCents: 150_000 },
      { number: 3, amountCents: 150_000 },
    ])
  })
})
