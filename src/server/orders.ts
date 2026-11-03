/**
 * Pedidos: rascunho, itens, totais, finalização e cancelamento (RF-12 a RF-31).
 */
import { getDb } from '@/db/client'
import { isBugOn } from '@/domain/bugs'
import type { Installment } from '@/domain/installments'
import { ERROR_MESSAGES as E, FIELD_MESSAGES as M, type TransitionAction } from '@/domain/messages'
import { fromHundredths } from '@/domain/numbers'
import { decide, isOrderStatus, type OrderAction, type OrderStatus } from '@/domain/order-state'
import { computeOrderTotals, type PaymentMethod, type PricingInput } from '@/domain/pricing'
import {
  itemTotalCents,
  unitPriceCents,
  validateQuantity,
  type PricedProduct,
  type Unit,
} from '@/domain/units'
import {
  quantityMessage,
  quantityOf,
  reasonOf,
  validateCustomerId,
  validateItemProduct,
  validateOrderHeader,
  validateReason,
} from '@/domain/validation'
import { now } from './clock'
import { invalidateDashboard } from './dashboard'
import { ApiError, notFound, unwrap, validationError } from './errors'
import { requireJson } from './http'
import { findProductRow } from './products'

export type OrderRow = {
  id: number
  customer_id: number
  status: OrderStatus
  discount_bp: number
  freight_cents: number
  payment_method: PaymentMethod
  installments: number
  subtotal_cents: number
  discount_cents: number
  net_cents: number
  free_shipping: number
  freight_charged_cents: number
  total_cents: number
  installment_plan: string
  balance_cents: number
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

type ItemRow = {
  id: number
  order_id: number
  product_id: number
  code: string
  name: string
  unit: Unit
  roll_length_centi: number | null
  price_cents: number
  quantity_centi: number
  unit_price_cents: number
  total_cents: number
}

type HistoryRow = {
  from_status: OrderStatus
  to_status: OrderStatus
  reason: string | null
  at: string
}

export type OrderItem = {
  id: number
  productId: number
  code: string
  name: string
  unit: Unit
  rollLength: number | null
  priceCents: number
  unitPriceCents: number
  quantity: number
  totalCents: number
}

export type HistoryEntry = { from: OrderStatus; to: OrderStatus; at: string; reason: string | null }

export type Order = {
  id: number
  number: number
  status: OrderStatus
  customer: { id: number; name: string; type: 'PF' | 'PJ'; document: string; cep: string }
  items: OrderItem[]
  subtotalCents: number
  discountPct: number
  discountCents: number
  netCents: number
  freightCents: number
  freightChargedCents: number
  freeShipping: boolean
  totalCents: number
  paymentMethod: PaymentMethod
  installments: number
  installmentPlan: Installment[]
  invoicedCents: number
  balanceCents: number
  cancelReason: string | null
  history: HistoryEntry[]
  createdAt: string
  updatedAt: string
}

export type OrderSummary = {
  id: number
  number: number
  status: OrderStatus
  customer: { id: number; name: string }
  totalCents: number
  balanceCents: number
  createdAt: string
}

function toItem(row: ItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id,
    code: row.code,
    name: row.name,
    unit: row.unit,
    rollLength: row.roll_length_centi === null ? null : fromHundredths(row.roll_length_centi),
    priceCents: row.price_cents,
    unitPriceCents: row.unit_price_cents,
    quantity: fromHundredths(row.quantity_centi),
    totalCents: row.total_cents,
  }
}

function toOrder(row: OrderRow): Order {
  const db = getDb()
  const customer = db
    .prepare('SELECT id, name, type, document, cep FROM customers WHERE id = ?')
    .get(row.customer_id) as Order['customer']
  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')
    .all(row.id) as ItemRow[]
  const history = db
    .prepare(
      'SELECT from_status, to_status, reason, at FROM order_history WHERE order_id = ? ORDER BY id',
    )
    .all(row.id) as HistoryRow[]
  const invoicedCents = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) FROM invoices
       WHERE order_id = ? AND status = 'issued'`,
    )
    .pluck()
    .get(row.id) as number
  return {
    id: row.id,
    number: row.id,
    status: row.status,
    customer,
    items: items.map(toItem),
    subtotalCents: row.subtotal_cents,
    discountPct: fromHundredths(row.discount_bp),
    discountCents: row.discount_cents,
    netCents: row.net_cents,
    freightCents: row.freight_cents,
    freightChargedCents: row.freight_charged_cents,
    freeShipping: row.free_shipping === 1,
    totalCents: row.total_cents,
    paymentMethod: row.payment_method,
    installments: row.installments,
    installmentPlan: JSON.parse(row.installment_plan) as Installment[],
    invoicedCents,
    balanceCents: row.balance_cents,
    cancelReason: row.cancel_reason,
    history: history.map((h) => ({
      from: h.from_status,
      to: h.to_status,
      at: h.at,
      reason: h.reason,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function findOrderRow(id: number): OrderRow | undefined {
  return getDb().prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRow | undefined
}

export function requireOrder(id: number | null): OrderRow {
  const row = id === null ? undefined : findOrderRow(id)
  if (!row) throw notFound('Pedido')
  return row
}

function findItem(orderId: number, itemId: number | null): ItemRow {
  const row =
    itemId === null
      ? undefined
      : (getDb()
          .prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?')
          .get(itemId, orderId) as ItemRow | undefined)
  if (!row) throw notFound('Item')
  return row
}

/** Aplica a máquina de estados: lança o 409 ou diz se a ação é uma repetição sem efeito. */
export function checkAction(order: OrderRow, action: OrderAction): 'allow' | 'noop' {
  const decision = decide(order.status, action)
  if (decision.kind !== 'reject') return decision.kind
  if (decision.code === 'ORDER_NOT_EDITABLE') {
    throw new ApiError('ORDER_NOT_EDITABLE', E.orderNotEditable(order.status))
  }
  // Só finalizar, cancelar e emitir nota chegam aqui com INVALID_TRANSITION.
  throw new ApiError(
    'INVALID_TRANSITION',
    E.invalidTransition(action as TransitionAction, order.status),
  )
}

/** RF-30: cada transição de estado deixa um registro no histórico. */
export function recordTransition(
  orderId: number,
  from: OrderStatus,
  to: OrderStatus,
  reason: string | null = null,
): void {
  getDb()
    .prepare(
      'INSERT INTO order_history (order_id, from_status, to_status, reason, at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(orderId, from, to, reason, now())
}

function assertCustomerExists(customerId: number): void {
  const exists = getDb().prepare('SELECT 1 FROM customers WHERE id = ?').get(customerId)
  if (!exists) throw validationError({ customerId: M.customer })
}

/** RF-17, RF-24: recalcula e grava os totais de um rascunho a partir dos itens e do cabeçalho. */
function recalculate(orderId: number, overrides: Partial<PricingInput> = {}): void {
  const db = getDb()
  const order = requireOrder(orderId)
  const itemTotalsCents = db
    .prepare('SELECT total_cents FROM order_items WHERE order_id = ? ORDER BY id')
    .pluck()
    .all(orderId) as number[]
  const cep = db
    .prepare('SELECT cep FROM customers WHERE id = ?')
    .pluck()
    .get(order.customer_id) as string
  const totals = computeOrderTotals({
    itemTotalsCents,
    discountBp: order.discount_bp,
    freightCents: order.freight_cents,
    paymentMethod: order.payment_method,
    cep,
    installments: order.installments,
    ...overrides,
  })
  db.prepare(
    `UPDATE orders
     SET subtotal_cents = ?, discount_cents = ?, net_cents = ?, free_shipping = ?,
         freight_charged_cents = ?, total_cents = ?, installment_plan = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    totals.subtotalCents,
    totals.discountCents,
    totals.netCents,
    totals.freeShipping ? 1 : 0,
    totals.freightChargedCents,
    totals.totalCents,
    JSON.stringify(totals.installmentPlan),
    now(),
    orderId,
  )
}

/** Um cliente editado muda o CEP usado no frete grátis dos rascunhos dele. */
export function recalculateDraftsOf(customerId: number): void {
  const ids = getDb()
    .prepare("SELECT id FROM orders WHERE customer_id = ? AND status = 'draft'")
    .pluck()
    .all(customerId) as number[]
  for (const id of ids) recalculate(id)
}

export function getOrder(id: number | null): Order {
  return toOrder(requireOrder(id))
}

/** RF-12 */
export function listOrders(status: string | null = null): OrderSummary[] {
  if (status && !isOrderStatus(status)) throw validationError({ status: M.statusFilter })
  const rows = getDb()
    .prepare(
      `SELECT o.id, o.status, o.total_cents, o.balance_cents, o.created_at,
              c.id AS customer_id, c.name AS customer_name
       FROM orders o JOIN customers c ON c.id = o.customer_id
       WHERE ? IS NULL OR o.status = ?
       ORDER BY o.id DESC`,
    )
    .all(status || null, status || null) as {
    id: number
    status: OrderStatus
    total_cents: number
    balance_cents: number
    created_at: string
    customer_id: number
    customer_name: string
  }[]
  return rows.map((row) => ({
    id: row.id,
    number: row.id,
    status: row.status,
    customer: { id: row.customer_id, name: row.customer_name },
    totalCents: row.total_cents,
    balanceCents: row.balance_cents,
    createdAt: row.created_at,
  }))
}

/** RF-13 */
export function createOrder(body: unknown): Order {
  const customerId = unwrap(validateCustomerId(requireJson(body)))
  assertCustomerExists(customerId)
  const at = now()
  const db = getDb()
  const id = db.transaction(() => {
    const info = db
      .prepare(
        "INSERT INTO orders (customer_id, status, created_at, updated_at) VALUES (?, 'draft', ?, ?)",
      )
      .run(customerId, at, at)
    const orderId = Number(info.lastInsertRowid)
    recalculate(orderId)
    return orderId
  })()
  return getOrder(id)
}

/** RF-18 a RF-22, RF-27: o PUT substitui o cabeçalho de um rascunho. */
export function updateOrderHeader(id: number | null, body: unknown): Order {
  const order = requireOrder(id)
  checkAction(order, 'save')
  const input = unwrap(validateOrderHeader(requireJson(body)))
  assertCustomerExists(input.customerId)
  const db = getDb()
  db.transaction(() => {
    db.prepare(
      `UPDATE orders
       SET customer_id = ?, discount_bp = ?, freight_cents = ?, payment_method = ?, installments = ?
       WHERE id = ?`,
    ).run(
      input.customerId,
      input.discountBp,
      input.freightCents,
      input.paymentMethod,
      input.installments,
      order.id,
    )
    recalculate(order.id)
  })()
  return getOrder(order.id)
}

function pricedFrom(row: { unit: Unit; price_cents: number; roll_length_centi: number | null }) {
  const product: PricedProduct = {
    unit: row.unit,
    priceCents: row.price_cents,
    rollLengthCenti: row.roll_length_centi,
  }
  return product
}

function validQuantity(unit: Unit, body: unknown): number {
  const quantity = validateQuantity(unit, quantityOf(body))
  if (!quantity.ok) throw validationError({ quantity: quantityMessage(quantity.error) })
  return quantity.centi
}

/** RF-14: o item copia nome, unidade, comprimento e preço do produto. */
export function addItem(id: number | null, body: unknown): Order {
  const order = requireOrder(id)
  checkAction(order, 'editItems')
  const payload = requireJson(body)
  const productId = unwrap(validateItemProduct(payload))
  const product = findProductRow(productId)
  if (!product) throw validationError({ productId: M.product })
  const quantityCenti = validQuantity(product.unit, payload)
  const db = getDb()
  const duplicate = db
    .prepare('SELECT 1 FROM order_items WHERE order_id = ? AND product_id = ?')
    .get(order.id, product.id)
  if (duplicate) throw new ApiError('DUPLICATE_ITEM', E.duplicateItem)

  const priced = pricedFrom(product)
  db.transaction(() => {
    db.prepare(
      `INSERT INTO order_items
        (order_id, product_id, code, name, unit, roll_length_centi, price_cents, quantity_centi,
         unit_price_cents, total_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      order.id,
      product.id,
      product.code,
      product.name,
      product.unit,
      product.roll_length_centi,
      product.price_cents,
      quantityCenti,
      unitPriceCents(priced, quantityCenti),
      itemTotalCents(priced, quantityCenti),
    )
    recalculate(order.id)
  })()
  return getOrder(order.id)
}

/** RF-17: a edição de quantidade recalcula o pedido inteiro. */
export function updateItem(id: number | null, itemId: number | null, body: unknown): Order {
  const order = requireOrder(id)
  const item = findItem(order.id, itemId)
  checkAction(order, 'editItems')
  const quantityCenti = validQuantity(item.unit, requireJson(body))
  const priced = pricedFrom(item)
  const db = getDb()
  db.transaction(() => {
    db.prepare(
      'UPDATE order_items SET quantity_centi = ?, unit_price_cents = ?, total_cents = ? WHERE id = ?',
    ).run(
      quantityCenti,
      unitPriceCents(priced, quantityCenti),
      itemTotalCents(priced, quantityCenti),
      item.id,
    )
    // BUG-1: o recálculo da edição de quantidade usa o subtotal como líquido e ignora o desconto.
    recalculate(order.id, isBugOn(1) ? { discountBp: 0 } : {})
  })()
  return getOrder(order.id)
}

export function removeItem(id: number | null, itemId: number | null): Order {
  const order = requireOrder(id)
  const item = findItem(order.id, itemId)
  checkAction(order, 'editItems')
  const db = getDb()
  db.transaction(() => {
    db.prepare('DELETE FROM order_items WHERE id = ?').run(item.id)
    recalculate(order.id)
  })()
  return getOrder(order.id)
}

/** RF-28: congela os valores; repetir a finalização não tem efeito. */
export function finalizeOrder(id: number | null): Order {
  const order = requireOrder(id)
  if (checkAction(order, 'finalize') === 'noop') return getOrder(order.id)
  const db = getDb()
  const items = db
    .prepare('SELECT COUNT(*) FROM order_items WHERE order_id = ?')
    .pluck()
    .get(order.id) as number
  if (items === 0) throw new ApiError('ORDER_INCOMPLETE', E.orderIncomplete)
  db.transaction(() => {
    db.prepare(
      "UPDATE orders SET status = 'finalized', balance_cents = total_cents, updated_at = ? WHERE id = ?",
    ).run(now(), order.id)
    recordTransition(order.id, order.status, 'finalized')
  })()
  invalidateDashboard()
  return getOrder(order.id)
}

/** RF-29: exige motivo; repetir o cancelamento mantém o motivo original. */
export function cancelOrder(id: number | null, body: unknown): Order {
  const order = requireOrder(id)
  if (checkAction(order, 'cancel') === 'noop') return getOrder(order.id)
  const reason = validateReason(reasonOf(requireJson(body)))
  if (reason === null) throw new ApiError('REASON_REQUIRED', E.reasonRequired)
  const db = getDb()
  db.transaction(() => {
    db.prepare(
      "UPDATE orders SET status = 'canceled', cancel_reason = ?, balance_cents = 0, updated_at = ? WHERE id = ?",
    ).run(reason, now(), order.id)
    recordTransition(order.id, order.status, 'canceled', reason)
  })()
  invalidateDashboard()
  return getOrder(order.id)
}
