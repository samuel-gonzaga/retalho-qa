/**
 * Desconto, frete grátis e total do pedido (RF-18 a RF-21).
 */
import { installmentPlan, type Installment } from './installments'
import { divRoundHalfUp } from './money'

export const PAYMENT_METHODS = ['pix', 'boleto', 'card'] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const FREE_SHIPPING_MIN_NET_CENTS = 30_000
export const MAX_FREIGHT_CENTS = 999_999
export const MAX_DISCOUNT_BP = 10_000

/** Área de entrega própria: CEPs de 01000-000 a 09999-999. */
const LOCAL_CEP_MIN = 1_000_000
const LOCAL_CEP_MAX = 9_999_999

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value)
}

export function isLocalCep(cep: string): boolean {
  const digits = Number(cep.replace('-', ''))
  return digits >= LOCAL_CEP_MIN && digits <= LOCAL_CEP_MAX
}

/** RF-20: grátis só quando as três condições são verdadeiras. */
export function isFreeShipping(input: {
  netCents: number
  paymentMethod: PaymentMethod
  cep: string
}): boolean {
  return (
    input.netCents >= FREE_SHIPPING_MIN_NET_CENTS &&
    input.paymentMethod === 'pix' &&
    isLocalCep(input.cep)
  )
}

/** RF-18: subtotal × percentual, arredondado ao centavo. O percentual vem em centésimos (10 % = 1000). */
export function discountCents(subtotalCents: number, discountBp: number): number {
  return divRoundHalfUp(subtotalCents * discountBp, MAX_DISCOUNT_BP)
}

export type PricingInput = {
  itemTotalsCents: number[]
  discountBp: number
  freightCents: number
  paymentMethod: PaymentMethod
  cep: string
  installments: number
}

export type OrderTotals = {
  subtotalCents: number
  discountCents: number
  netCents: number
  freeShipping: boolean
  freightChargedCents: number
  totalCents: number
  installmentPlan: Installment[]
}

/** RF-21: total = (subtotal − desconto) + frete cobrado, com o plano de parcelas (RF-23). */
export function computeOrderTotals(input: PricingInput): OrderTotals {
  const subtotal = input.itemTotalsCents.reduce((sum, total) => sum + total, 0)
  const discount = discountCents(subtotal, input.discountBp)
  const net = subtotal - discount
  const freeShipping = isFreeShipping({
    netCents: net,
    paymentMethod: input.paymentMethod,
    cep: input.cep,
  })
  const freightCharged = freeShipping ? 0 : input.freightCents
  const total = net + freightCharged
  return {
    subtotalCents: subtotal,
    discountCents: discount,
    netCents: net,
    freeShipping,
    freightChargedCents: freightCharged,
    totalCents: total,
    installmentPlan: installmentPlan(total, input.installments),
  }
}
