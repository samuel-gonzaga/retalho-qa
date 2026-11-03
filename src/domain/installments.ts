/**
 * Plano de parcelas (RF-22, RF-23).
 */
import { isBugOn } from './bugs'

export const MIN_INSTALLMENTS = 1
export const MAX_INSTALLMENTS = 3

export type Installment = { number: number; amountCents: number }

/** Parcelas truncadas no centavo; a última absorve a diferença, e a soma é sempre o total. */
export function installmentPlan(totalCents: number, count: number): Installment[] {
  const base = Math.floor(totalCents / count)
  return Array.from({ length: count }, (_, index) => {
    // BUG-4: a última parcela recebe o valor truncado e não absorve a diferença de centavos.
    const isLast = index === count - 1 && !isBugOn(4)
    const amountCents = isLast ? totalCents - base * (count - 1) : base
    return { number: index + 1, amountCents }
  })
}
