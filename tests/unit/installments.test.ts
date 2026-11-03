import { describe, expect, it } from 'vitest'
import { installmentPlan } from '@/domain/installments'

describe('RF-23 · valor das parcelas', () => {
  // Totais divisíveis pelo número de parcelas escondem o BUG-04; só os outros recebem a etiqueta.
  it.each([
    ['R$ 100,00 em 1', 10_000, [10_000]],
    ['R$ 100,00 em 2', 10_000, [5000, 5000]],
    ['[BUG-04] R$ 100,00 em 3', 10_000, [3333, 3333, 3334]],
    ['[BUG-04] R$ 10,00 em 3', 1000, [333, 333, 334]],
    ['[BUG-04] R$ 0,10 em 3', 10, [3, 3, 4]],
    ['R$ 4.500,00 em 3', 450_000, [150_000, 150_000, 150_000]],
  ])('%s parcela(s): a última absorve os centavos e a soma é o total', (_, total, amounts) => {
    const plan = installmentPlan(total, amounts.length)
    expect(plan.map((p) => p.amountCents)).toEqual(amounts)
    expect(plan.map((p) => p.number)).toEqual(amounts.map((__, i) => i + 1))
    expect(plan.reduce((sum, p) => sum + p.amountCents, 0)).toBe(total)
  })
})
