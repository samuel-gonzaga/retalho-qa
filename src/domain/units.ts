/**
 * Unidades de venda, regras de quantidade e conversão para preço unitário (RF-05, RF-15, RF-16).
 */
import { isBugOn } from './bugs'
import { divRoundHalfUp } from './money'
import { decimalPlaces, toHundredths } from './numbers'

export const UNITS = ['meter', 'roll', 'unit'] as const

export type Unit = (typeof UNITS)[number]

export const MIN_QUANTITY_CENTI = 1
export const MAX_QUANTITY_CENTI = 100_000

/** Dados de preço que um item copia do produto (RF-03). */
export type PricedProduct = {
  unit: Unit
  /** Preço por metro (metro e rolo) ou por unidade (unidade), em centavos. */
  priceCents: number
  /** Comprimento do rolo em centésimos de metro; null fora do rolo. */
  rollLengthCenti: number | null
}

export type QuantityError = 'range' | 'decimals' | 'integer'

export type QuantityResult = { ok: true; centi: number } | { ok: false; error: QuantityError }

export function isUnit(value: unknown): value is Unit {
  return typeof value === 'string' && (UNITS as readonly string[]).includes(value)
}

/** RF-15: de 0,01 a 1.000; metro com até 2 casas; rolo e unidade só inteiros. */
export function validateQuantity(unit: Unit, value: unknown): QuantityResult {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, error: 'range' }
  if (value < MIN_QUANTITY_CENTI / 100 || value > MAX_QUANTITY_CENTI / 100) {
    return { ok: false, error: 'range' }
  }
  if (unit !== 'meter' && !Number.isInteger(value)) return { ok: false, error: 'integer' }
  const places = decimalPlaces(value)
  const centi = toHundredths(value)
  if (places === null || centi === null) return { ok: false, error: 'decimals' }
  return { ok: true, centi }
}

/** RF-05: comprimento × preço por metro, arredondado ao centavo. */
export function rollPriceCents(lengthCenti: number, pricePerMeterCents: number): number {
  return divRoundHalfUp(lengthCenti * pricePerMeterCents, 100)
}

/** RF-16: preço de uma unidade de venda (1 m, 1 rolo ou 1 unidade). */
export function unitPriceCents(product: PricedProduct, quantityCenti: number): number {
  switch (product.unit) {
    case 'meter':
    case 'unit':
      return product.priceCents
    case 'roll': {
      const rollPrice = rollPriceCents(product.rollLengthCenti ?? 0, product.priceCents)
      // BUG-2: trata o preço do rolo como total da linha e o divide pela quantidade de rolos.
      // Com 1 rolo, dividir por 1 não muda o valor, e o defeito fica escondido.
      if (isBugOn(2)) return divRoundHalfUp(rollPrice * 100, quantityCenti)
      return rollPrice
    }
  }
}

/** RF-16: quantidade × preço unitário, arredondado ao centavo. */
export function itemTotalCents(product: PricedProduct, quantityCenti: number): number {
  return divRoundHalfUp(quantityCenti * unitPriceCents(product, quantityCenti), 100)
}
