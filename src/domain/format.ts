/**
 * Formatos de exibição da interface em português do Brasil (RNF-10).
 */
import { formatBRL } from './money'
import { parseDecimalInput, toHundredths } from './numbers'
import type { Unit } from './units'

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const TIME_ZONE = 'America/Sao_Paulo'
const date = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const time = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatDecimal(value: number): string {
  return decimal.format(value)
}

/** 2,35 m · 1 rolo · 4 rolos · 3 un */
export function formatQuantity(quantity: number, unit: Unit): string {
  const amount = formatDecimal(quantity)
  if (unit === 'meter') return `${amount} m`
  if (unit === 'roll') return `${amount} ${quantity === 1 ? 'rolo' : 'rolos'}`
  return `${amount} un`
}

export function formatPercent(pct: number): string {
  return `${formatDecimal(pct)} %`
}

type PriceOfProduct = {
  unit: Unit
  priceCents: number
  rollLength: number | null
  rollPriceCents: number | null
}

/** RF-04: R$ 4,00/m · R$ 20,00 o rolo de 5 m · R$ 1,50/un */
export function formatProductPrice(product: PriceOfProduct): string {
  if (product.unit === 'roll') {
    return `${formatBRL(product.rollPriceCents ?? 0)} o rolo de ${formatDecimal(product.rollLength ?? 0)} m`
  }
  return formatUnitPrice(product.priceCents, product.unit)
}

/** RF-16: preço de uma unidade de venda do item. */
export function formatUnitPrice(cents: number, unit: Unit): string {
  const suffix = { meter: '/m', roll: '/rolo', unit: '/un' }[unit]
  return `${formatBRL(cents)}${suffix}`
}

export function formatDate(iso: string): string {
  return date.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  const moment = new Date(iso)
  return `${date.format(moment)} ${time.format(moment)}`
}

/** RF-32: NI 0001 */
export function formatInvoiceNumber(number: number): string {
  return `NI ${String(number).padStart(4, '0')}`
}

/** Valor em reais digitado num campo ("49,90") para centavos; null se não for um valor válido. */
export function parseMoneyInput(text: string): number | null {
  const value = parseDecimalInput(text)
  return value === null ? null : toHundredths(value)
}

/** Centavos para preencher um campo de valor ("200,00"). */
export function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`
}

/** Número para preencher um campo decimal ("2,35"). */
export function decimalToInput(value: number): string {
  return String(value).replace('.', ',')
}
