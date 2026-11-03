/**
 * Notas internas: emissão, cancelamento e lista (RF-32 a RF-35).
 */
import { getDb } from '@/db/client'
import { isBugOn } from '@/domain/bugs'
import { ERROR_MESSAGES as E, FIELD_MESSAGES as M } from '@/domain/messages'
import { statusAfterInvoiceChange } from '@/domain/order-state'
import { amountOf, reasonOf, validateAmountCents, validateReason } from '@/domain/validation'
import { now } from './clock'
import { invalidateDashboard } from './dashboard'
import { ApiError, notFound, validationError } from './errors'
import { requireJson } from './http'
import { checkAction, getOrder, recordTransition, requireOrder, type Order } from './orders'

type InvoiceRow = {
  id: number
  order_id: number
  amount_cents: number
  status: 'issued' | 'canceled'
  issued_at: string
  canceled_at: string | null
  cancel_reason: string | null
  customer_name: string
}

export type Invoice = {
  id: number
  number: number
  orderId: number
  orderNumber: number
  customerName: string
  amountCents: number
  status: 'issued' | 'canceled'
  issuedAt: string
  canceledAt: string | null
  cancelReason: string | null
}

const SELECT_INVOICES = `
  SELECT i.*, c.name AS customer_name
  FROM invoices i
  JOIN orders o ON o.id = i.order_id
  JOIN customers c ON c.id = o.customer_id`

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.id,
    orderId: row.order_id,
    orderNumber: row.order_id,
    customerName: row.customer_name,
    amountCents: row.amount_cents,
    status: row.status,
    issuedAt: row.issued_at,
    canceledAt: row.canceled_at,
    cancelReason: row.cancel_reason,
  }
}

function findInvoice(id: number | null): InvoiceRow {
  const row =
    id === null
      ? undefined
      : (getDb().prepare(`${SELECT_INVOICES} WHERE i.id = ?`).get(id) as InvoiceRow | undefined)
  if (!row) throw notFound('Nota')
  return row
}

function activeInvoices(orderId: number): number {
  return getDb()
    .prepare("SELECT COUNT(*) FROM invoices WHERE order_id = ? AND status = 'issued'")
    .pluck()
    .get(orderId) as number
}

export type InvoiceResult = { invoice: Invoice; order: Order }

/** RF-35: da mais recente para a mais antiga; o total soma só as emitidas. */
export function listInvoices(): { invoices: Invoice[]; totalInvoicedCents: number } {
  const rows = getDb().prepare(`${SELECT_INVOICES} ORDER BY i.id DESC`).all() as InvoiceRow[]
  const invoices = rows.map(toInvoice)
  const totalInvoicedCents = invoices
    .filter((invoice) => invoice.status === 'issued')
    .reduce((sum, invoice) => sum + invoice.amountCents, 0)
  return { invoices, totalInvoicedCents }
}

/** RF-32, RF-33: valor até o saldo; o estado segue o saldo que sobra. */
export function issueInvoice(orderId: number | null, body: unknown): InvoiceResult {
  const order = requireOrder(orderId)
  checkAction(order, 'invoice')
  const amount = validateAmountCents(amountOf(requireJson(body)))
  if (amount === null) throw validationError({ amountCents: M.amount })
  if (amount > order.balance_cents) {
    throw new ApiError(
      'AMOUNT_EXCEEDS_BALANCE',
      E.amountExceedsBalance(amount, order.balance_cents),
    )
  }
  const db = getDb()
  const invoiceId = db.transaction(() => {
    const at = now()
    const info = db
      .prepare(
        "INSERT INTO invoices (order_id, amount_cents, status, issued_at) VALUES (?, ?, 'issued', ?)",
      )
      .run(order.id, amount, at)
    const balance = order.balance_cents - amount
    const status = statusAfterInvoiceChange(balance, activeInvoices(order.id))
    db.prepare('UPDATE orders SET balance_cents = ?, status = ?, updated_at = ? WHERE id = ?').run(
      balance,
      status,
      at,
      order.id,
    )
    recordTransition(order.id, order.status, status)
    return Number(info.lastInsertRowid)
  })()
  invalidateDashboard()
  return { invoice: toInvoice(findInvoice(invoiceId)), order: getOrder(order.id) }
}

/** RF-34: devolve o valor ao saldo e recalcula o estado; repetir não tem efeito. */
export function cancelInvoice(invoiceId: number | null, body: unknown): InvoiceResult {
  const invoice = findInvoice(invoiceId)
  if (invoice.status === 'canceled') {
    return { invoice: toInvoice(invoice), order: getOrder(invoice.order_id) }
  }
  const reason = validateReason(reasonOf(requireJson(body)))
  if (reason === null) throw new ApiError('REASON_REQUIRED', E.reasonRequired)
  const db = getDb()
  db.transaction(() => {
    const at = now()
    db.prepare(
      "UPDATE invoices SET status = 'canceled', canceled_at = ?, cancel_reason = ? WHERE id = ?",
    ).run(at, reason, invoice.id)
    // BUG-5: o cancelamento para aqui e não devolve o saldo nem recalcula o estado do pedido.
    if (isBugOn(5)) return
    const order = requireOrder(invoice.order_id)
    const balance = order.balance_cents + invoice.amount_cents
    const status = statusAfterInvoiceChange(balance, activeInvoices(order.id))
    db.prepare('UPDATE orders SET balance_cents = ?, status = ?, updated_at = ? WHERE id = ?').run(
      balance,
      status,
      at,
      order.id,
    )
    recordTransition(order.id, order.status, status, reason)
  })()
  invalidateDashboard()
  return { invoice: toInvoice(findInvoice(invoice.id)), order: getOrder(invoice.order_id) }
}
