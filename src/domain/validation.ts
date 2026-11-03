/**
 * Validação das entradas da API, com as mensagens por campo da seção 11.2.
 */
import { isValidCnpj, isValidCpf, normalizeCep, normalizeCnpj, normalizeCpf } from './documents'
import { MAX_INSTALLMENTS, MIN_INSTALLMENTS } from './installments'
import { FIELD_MESSAGES as M } from './messages'
import { toHundredths } from './numbers'
import { isPaymentMethod, MAX_DISCOUNT_BP, MAX_FREIGHT_CENTS, type PaymentMethod } from './pricing'
import { isUnit, type QuantityError, type Unit } from './units'

export type FieldErrors = Record<string, string>

export type Validation<T> = { ok: true; value: T } | { ok: false; fields: FieldErrors }

const MAX_PRICE_CENTS = 9_999_999
const MAX_ROLL_LENGTH_CENTI = 50_000
const REASON_MIN = 10
const REASON_MAX = 200

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {}
}

function trimmedText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length >= min && text.length <= max ? text : null
}

function isIntegerIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function result<T>(fields: FieldErrors, value: () => T): Validation<T> {
  return Object.keys(fields).length > 0 ? { ok: false, fields } : { ok: true, value: value() }
}

export type ProductInput = {
  code: string
  name: string
  unit: Unit
  priceCents: number
  rollLengthCenti: number | null
}

/** RF-01 */
export function validateProductInput(body: unknown): Validation<ProductInput> {
  const input = asRecord(body)
  const fields: FieldErrors = {}
  const code = typeof input.code === 'string' && /^[A-Z0-9]{3,12}$/.test(input.code)
  if (!code) fields.code = M.productCode
  const name = trimmedText(input.name, 2, 80)
  if (name === null) fields.name = M.productName
  if (!isUnit(input.unit)) fields.unit = M.productUnit
  if (!isIntegerIn(input.priceCents, 1, MAX_PRICE_CENTS)) fields.priceCents = M.productPrice

  let rollLengthCenti: number | null = null
  if (input.unit === 'roll') {
    const centi = typeof input.rollLength === 'number' ? toHundredths(input.rollLength) : null
    if (centi === null || centi < 1 || centi > MAX_ROLL_LENGTH_CENTI) {
      fields.rollLength = M.rollLength
    } else {
      rollLengthCenti = centi
    }
  } else if (input.rollLength !== undefined && input.rollLength !== null) {
    fields.rollLength = M.rollLengthNotApplicable
  }

  return result(fields, () => ({
    code: input.code as string,
    name: name as string,
    unit: input.unit as Unit,
    priceCents: input.priceCents as number,
    rollLengthCenti,
  }))
}

export type CustomerInput = {
  type: 'PF' | 'PJ'
  name: string
  document: string
  cep: string
}

/** RF-06 a RF-09 */
export function validateCustomerInput(body: unknown): Validation<CustomerInput> {
  const input = asRecord(body)
  const fields: FieldErrors = {}
  const type = input.type === 'PF' || input.type === 'PJ' ? input.type : null
  if (type === null) fields.type = M.customerType
  const name = trimmedText(input.name, 2, 120)
  if (name === null) fields.name = M.customerName

  const raw = typeof input.document === 'string' ? input.document : ''
  let document: string | null = null
  if (type === 'PF') {
    document = isValidCpf(raw) ? normalizeCpf(raw) : null
    if (document === null) fields.document = M.cpf
  } else if (type === 'PJ') {
    document = isValidCnpj(raw) ? normalizeCnpj(raw) : null
    if (document === null) fields.document = M.cnpj
  }

  const cep = typeof input.cep === 'string' ? normalizeCep(input.cep) : null
  if (cep === null) fields.cep = M.cep

  return result(fields, () => ({
    type: type as 'PF' | 'PJ',
    name: name as string,
    document: document as string,
    cep: cep as string,
  }))
}

function isId(value: unknown): value is number {
  return isIntegerIn(value, 1, Number.MAX_SAFE_INTEGER)
}

/** RF-13: cliente do pedido novo. */
export function validateCustomerId(body: unknown): Validation<number> {
  const { customerId } = asRecord(body)
  return result(isId(customerId) ? {} : { customerId: M.customer }, () => customerId as number)
}

export type OrderHeaderInput = {
  customerId: number
  discountBp: number
  freightCents: number
  paymentMethod: PaymentMethod
  installments: number
}

/** RF-18, RF-19, RF-22: o PUT substitui todos os campos do cabeçalho. */
export function validateOrderHeader(body: unknown): Validation<OrderHeaderInput> {
  const input = asRecord(body)
  const fields: FieldErrors = {}
  if (!isId(input.customerId)) fields.customerId = M.customer
  const discountBp = typeof input.discountPct === 'number' ? toHundredths(input.discountPct) : null
  if (discountBp === null || discountBp > MAX_DISCOUNT_BP) fields.discountPct = M.discount
  if (!isIntegerIn(input.freightCents, 0, MAX_FREIGHT_CENTS)) fields.freightCents = M.freight
  if (!isPaymentMethod(input.paymentMethod)) fields.paymentMethod = M.paymentMethod
  if (!isIntegerIn(input.installments, MIN_INSTALLMENTS, MAX_INSTALLMENTS)) {
    fields.installments = M.installments
  }
  return result(fields, () => ({
    customerId: input.customerId as number,
    discountBp: discountBp as number,
    freightCents: input.freightCents as number,
    paymentMethod: input.paymentMethod as PaymentMethod,
    installments: input.installments as number,
  }))
}

/** RF-14: o produto do item; a quantidade depende da unidade e é validada depois. */
export function validateItemProduct(body: unknown): Validation<number> {
  const { productId } = asRecord(body)
  return result(isId(productId) ? {} : { productId: M.product }, () => productId as number)
}

/** Corpo do item como objeto, para ler a quantidade depois de conhecer a unidade. */
export function quantityOf(body: unknown): unknown {
  return asRecord(body).quantity
}

const QUANTITY_MESSAGES: Record<QuantityError, string> = {
  range: M.quantityRange,
  decimals: M.quantityDecimals,
  integer: M.quantityInteger,
}

export function quantityMessage(error: QuantityError): string {
  return QUANTITY_MESSAGES[error]
}

/** RF-29, RF-34: motivo com 10 a 200 caracteres, sem contar espaços nas pontas. */
export function validateReason(value: unknown): string | null {
  return trimmedText(value, REASON_MIN, REASON_MAX)
}

export function reasonOf(body: unknown): unknown {
  return asRecord(body).reason
}

/** RF-32: valor da nota em centavos inteiros e positivos. */
export function validateAmountCents(value: unknown): number | null {
  return isIntegerIn(value, 1, Number.MAX_SAFE_INTEGER) ? value : null
}

export function amountOf(body: unknown): unknown {
  return asRecord(body).amountCents
}
