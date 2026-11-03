import { describe, expect, it } from 'vitest'
import {
  decide,
  statusAfterInvoiceChange,
  type OrderAction,
  type OrderStatus,
} from '@/domain/order-state'

type Expected = 'allow' | 'noop' | 'ORDER_NOT_EDITABLE' | 'INVALID_TRANSITION'

// Matriz de RF-26: resposta de cada ação em cada estado.
const MATRIX: Record<OrderStatus, Record<OrderAction, Expected>> = {
  draft: {
    save: 'allow',
    editItems: 'allow',
    finalize: 'allow',
    cancel: 'allow',
    invoice: 'INVALID_TRANSITION',
  },
  finalized: {
    save: 'ORDER_NOT_EDITABLE',
    editItems: 'ORDER_NOT_EDITABLE',
    finalize: 'noop',
    cancel: 'allow',
    invoice: 'allow',
  },
  partially_invoiced: {
    save: 'ORDER_NOT_EDITABLE',
    editItems: 'ORDER_NOT_EDITABLE',
    finalize: 'INVALID_TRANSITION',
    cancel: 'INVALID_TRANSITION',
    invoice: 'allow',
  },
  invoiced: {
    save: 'ORDER_NOT_EDITABLE',
    editItems: 'ORDER_NOT_EDITABLE',
    finalize: 'INVALID_TRANSITION',
    cancel: 'INVALID_TRANSITION',
    invoice: 'INVALID_TRANSITION',
  },
  canceled: {
    save: 'ORDER_NOT_EDITABLE',
    editItems: 'ORDER_NOT_EDITABLE',
    finalize: 'INVALID_TRANSITION',
    cancel: 'noop',
    invoice: 'INVALID_TRANSITION',
  },
}

const cases = Object.entries(MATRIX).flatMap(([status, actions]) =>
  Object.entries(actions).map(([action, expected]) => {
    const tag = status === 'invoiced' && action === 'save' ? '[BUG-03] ' : ''
    return [`${tag}${status} + ${action}`, status, action, expected] as [
      string,
      OrderStatus,
      OrderAction,
      Expected,
    ]
  }),
)

describe('RF-25 a RF-29 · máquina de estados do pedido', () => {
  it.each(cases)('%s → %s', (_, status, action, expected) => {
    const decision = decide(status, action)
    const outcome = decision.kind === 'reject' ? decision.code : decision.kind
    expect(outcome).toBe(expected)
  })
})

describe('RF-33, RF-34 · estado depois de emitir ou cancelar nota', () => {
  it.each([
    ['T4/T6/T8/T10: saldo restante e nota emitida', 20_000, 1, 'partially_invoiced'],
    ['T5/T7: saldo zerado', 0, 2, 'invoiced'],
    ['T9/T11: nenhuma nota emitida', 30_000, 0, 'finalized'],
  ])('%s → %s', (_, balanceCents, activeInvoices, expected) => {
    expect(statusAfterInvoiceChange(balanceCents, activeInvoices)).toBe(expected)
  })
})
