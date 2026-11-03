/**
 * Máquina de estados do pedido (RF-25 a RF-29, RF-33, RF-34).
 */

export const ORDER_STATUSES = [
  'draft',
  'finalized',
  'partially_invoiced',
  'invoiced',
  'canceled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** `save` é o PUT do cabeçalho; `editItems` cobre incluir, editar e remover item. */
export type OrderAction = 'save' | 'editItems' | 'finalize' | 'cancel' | 'invoice'

export type RejectionCode = 'ORDER_NOT_EDITABLE' | 'INVALID_TRANSITION'

export type Decision =
  { kind: 'allow' } | { kind: 'noop' } | { kind: 'reject'; code: RejectionCode }

const ALLOW: Decision = { kind: 'allow' }
const NOOP: Decision = { kind: 'noop' }
const reject = (code: RejectionCode): Decision => ({ kind: 'reject', code })

/** Estados em que o pedido não aceita alterações (RF-27). */
const LOCKED_STATUSES: readonly OrderStatus[] = [
  'finalized',
  'partially_invoiced',
  'invoiced',
  'canceled',
]

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value)
}

/** Decide se a ação é permitida, se é uma repetição sem efeito ou se deve ser recusada. */
export function decide(status: OrderStatus, action: OrderAction): Decision {
  switch (action) {
    case 'save':
    case 'editItems':
      return LOCKED_STATUSES.includes(status) ? reject('ORDER_NOT_EDITABLE') : ALLOW
    case 'finalize':
      if (status === 'draft') return ALLOW
      return status === 'finalized' ? NOOP : reject('INVALID_TRANSITION')
    case 'cancel':
      if (status === 'draft' || status === 'finalized') return ALLOW
      return status === 'canceled' ? NOOP : reject('INVALID_TRANSITION')
    case 'invoice':
      return status === 'finalized' || status === 'partially_invoiced'
        ? ALLOW
        : reject('INVALID_TRANSITION')
  }
}

/** Estado do pedido depois de emitir ou cancelar uma nota (T4 a T11). */
export function statusAfterInvoiceChange(
  balanceCents: number,
  activeInvoices: number,
): OrderStatus {
  if (balanceCents <= 0) return 'invoiced'
  return activeInvoices > 0 ? 'partially_invoiced' : 'finalized'
}
