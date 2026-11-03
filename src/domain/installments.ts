/**
 * Plano de parcelas (RF-22, RF-23).
 */

export const MIN_INSTALLMENTS = 1
export const MAX_INSTALLMENTS = 3

export type Installment = { number: number; amountCents: number }

/** Parcelas truncadas no centavo; a última absorve a diferença, e a soma é sempre o total. */
export function installmentPlan(totalCents: number, count: number): Installment[] {
  const base = Math.floor(totalCents / count)
  return Array.from({ length: count }, (_, index) => {
    const isLast = index === count - 1
    const amountCents = isLast ? totalCents - base * (count - 1) : base
    return { number: index + 1, amountCents }
  })
}
