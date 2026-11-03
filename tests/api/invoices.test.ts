import { describe, expect, it } from 'vitest'
import {
  api,
  cancelInvoice,
  createOrder,
  issueInvoice,
  orderWithTotal,
  useFreshDatabase,
} from './helpers'

useFreshDatabase()

describe('RF-32, RF-33 · emitir nota e saldo', () => {
  it('nota parcial, nota acima do saldo e nota total', async () => {
    const order = await orderWithTotal(30_000)

    const partial = await issueInvoice(order.id, 10_000)
    expect(partial.status).toBe(201)
    expect(partial.body.invoice).toMatchObject({ number: 1, amountCents: 10_000, status: 'issued' })
    expect(partial.body.order).toMatchObject({
      status: 'partially_invoiced',
      balanceCents: 20_000,
    })

    const tooMuch = await issueInvoice(order.id, 20_001)
    expect(tooMuch.status).toBe(422)
    expect(tooMuch.body.error.code).toBe('AMOUNT_EXCEEDS_BALANCE')
    expect(tooMuch.body.error.message).toContain('R$ 200,00')

    const total = await issueInvoice(order.id, 20_000)
    expect(total.body.order).toMatchObject({ status: 'invoiced', balanceCents: 0 })
  })

  it('valor zero devolve 422 VALIDATION_ERROR', async () => {
    const order = await orderWithTotal(1000)
    const res = await issueInvoice(order.id, 0)
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.fields.amountCents).toBeDefined()
  })

  it('pedido em rascunho ou faturado devolve 409', async () => {
    const draft = await createOrder()
    expect((await issueInvoice(draft.id, 100)).status).toBe(409)
    const order = await orderWithTotal(1000)
    await issueInvoice(order.id, 1000)
    const res = await issueInvoice(order.id, 1)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INVALID_TRANSITION')
  })
})

describe('RF-34 · cancelar nota', () => {
  it('[BUG-05] devolve o saldo e recalcula o estado do pedido', async () => {
    const order = await orderWithTotal(30_000)
    const first = await issueInvoice(order.id, 10_000)
    const second = await issueInvoice(order.id, 20_000)
    expect(second.body.order.status).toBe('invoiced')

    const canceled = await cancelInvoice(second.body.invoice.id)
    expect(canceled.status).toBe(200)
    expect(canceled.body.invoice.status).toBe('canceled')
    expect(canceled.body.order).toMatchObject({
      status: 'partially_invoiced',
      balanceCents: 20_000,
    })

    const last = await cancelInvoice(first.body.invoice.id)
    expect(last.body.order).toMatchObject({ status: 'finalized', balanceCents: 30_000 })
    expect((await issueInvoice(order.id, 30_000)).status).toBe(201)
  })

  it('exige motivo e repetir o cancelamento não muda nada', async () => {
    const order = await orderWithTotal(1000)
    const issued = await issueInvoice(order.id, 1000)
    const invoiceId = issued.body.invoice.id

    const noReason = await api('POST', `/api/invoices/${invoiceId}/cancel`, { reason: 'curto' })
    expect(noReason.status).toBe(422)
    expect(noReason.body.error.code).toBe('REASON_REQUIRED')

    await cancelInvoice(invoiceId, 'Valor digitado errado')
    const again = await cancelInvoice(invoiceId, 'Outro motivo qualquer')
    expect(again.status).toBe(200)
    expect(again.body.invoice.cancelReason).toBe('Valor digitado errado')
  })

  it('nota inexistente devolve 404', async () => {
    expect((await cancelInvoice(999)).status).toBe(404)
  })
})

describe('RF-30 · histórico do pedido', () => {
  it('[BUG-05] finalizar, faturar em duas notas e cancelar uma gera quatro registros', async () => {
    const order = await orderWithTotal(30_000)
    await issueInvoice(order.id, 10_000)
    const second = await issueInvoice(order.id, 20_000)
    await cancelInvoice(second.body.invoice.id, 'Nota emitida em duplicidade')

    const { body } = await api('GET', `/api/orders/${order.id}`)
    expect(
      body.order.history.map((h: { from: string; to: string }) => `${h.from}>${h.to}`),
    ).toEqual([
      'draft>finalized',
      'finalized>partially_invoiced',
      'partially_invoiced>invoiced',
      'invoiced>partially_invoiced',
    ])
    expect(body.order.history[3].reason).toBe('Nota emitida em duplicidade')
  })
})

describe('RF-35 · lista de notas', () => {
  it('o total faturado soma só as notas emitidas', async () => {
    const a = await orderWithTotal(10_000)
    const b = await orderWithTotal(20_000)
    const c = await orderWithTotal(5000)
    await issueInvoice(a.id, 10_000)
    await issueInvoice(b.id, 20_000)
    const canceled = await issueInvoice(c.id, 5000)
    await cancelInvoice(canceled.body.invoice.id)

    const res = await api('GET', '/api/invoices')
    expect(res.body.totalInvoicedCents).toBe(30_000)
    expect(res.body.invoices.map((i: { number: number }) => i.number)).toEqual([3, 2, 1])
    expect(res.body.invoices[0]).toMatchObject({
      status: 'canceled',
      orderNumber: c.number,
      customerName: c.customer.name,
    })
  })
})
