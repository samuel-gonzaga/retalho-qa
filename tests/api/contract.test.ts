import { describe, expect, it } from 'vitest'
import {
  addItem,
  api,
  createCustomer,
  createOrder,
  createProduct,
  header,
  issueInvoice,
  orderWithTotal,
  withFreshDatabase,
} from './helpers'

withFreshDatabase()

const CODES_WITH_FIELDS = new Set(['VALIDATION_ERROR'])

describe('RNF-11 · formato de erro em todas as rotas', () => {
  it.each([
    ['GET', '/api/products/999', undefined, undefined, 404, 'NOT_FOUND'],
    ['POST', '/api/products', undefined, 'abc', 400, 'INVALID_JSON'],
    ['POST', '/api/customers', {}, undefined, 422, 'VALIDATION_ERROR'],
    ['GET', '/api/customers/0', undefined, undefined, 404, 'NOT_FOUND'],
    ['POST', '/api/orders', { customerId: 999 }, undefined, 422, 'VALIDATION_ERROR'],
    ['GET', '/api/orders?status=pago', undefined, undefined, 422, 'VALIDATION_ERROR'],
    ['POST', '/api/orders/999/finalize', undefined, undefined, 404, 'NOT_FOUND'],
    ['POST', '/api/orders/999/invoices', { amountCents: 100 }, undefined, 404, 'NOT_FOUND'],
    [
      'POST',
      '/api/invoices/999/cancel',
      { reason: 'Motivo qualquer válido' },
      undefined,
      404,
      'NOT_FOUND',
    ],
    ['PUT', '/api/qa/bugs', undefined, '{ativos', 400, 'INVALID_JSON'],
  ] as const)(
    '%s %s devolve %i %s no formato padrão',
    async (method, path, body, raw, status, code) => {
      const res = await api(method, path, body, { raw })
      expect(res.status).toBe(status)
      expect(res.body.error.code).toBe(code)
      expect(typeof res.body.error.message).toBe('string')
      expect(res.body.error.message.length).toBeGreaterThan(10)
      expect(res.body.error.message).not.toContain(code)
      expect('fields' in res.body.error).toBe(CODES_WITH_FIELDS.has(code))
    },
  )

  it('a mensagem de recurso inexistente concorda em gênero com a nota', async () => {
    const res = await api('POST', '/api/invoices/999/cancel', { reason: 'Motivo qualquer válido' })
    expect(res.body.error.message).toBe('Nota não encontrada. Confira o número informado.')
  })
})

describe('RF-13 a RF-35 · status de sucesso', () => {
  it('criar devolve 201; ler, alterar, finalizar e cancelar devolvem 200', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const created = await api('POST', '/api/orders', { customerId: customer.id })
    expect(created.status).toBe(201)
    const id = created.body.order.id
    expect((await addItem(id, product.id, 2)).status).toBe(201)
    const itemId = (await api('GET', `/api/orders/${id}`)).body.order.items[0].id
    expect((await api('PATCH', `/api/orders/${id}/items/${itemId}`, { quantity: 3 })).status).toBe(
      200,
    )
    expect((await api('PUT', `/api/orders/${id}`, header(created.body.order))).status).toBe(200)
    expect((await api('POST', `/api/orders/${id}/finalize`)).status).toBe(200)
    expect((await issueInvoice(id, 1000)).status).toBe(201)
    expect((await api('GET', '/api/invoices')).status).toBe(200)
    expect((await api('GET', '/api/dashboard')).status).toBe(200)
  })
})

describe('RF-27 · idempotência do PUT', () => {
  it('repetir o mesmo PUT deixa o pedido igual e não gera histórico', async () => {
    const order = await orderWithTotal(12_345, false)
    const body = header(order, { discountPct: 5, freightCents: 990, paymentMethod: 'boleto' })
    const first = await api('PUT', `/api/orders/${order.id}`, body)
    const second = await api('PUT', `/api/orders/${order.id}`, body)
    const keys = ['subtotalCents', 'discountCents', 'freightChargedCents', 'totalCents']
    for (const key of keys) expect(second.body.order[key]).toBe(first.body.order[key])
    expect(second.body.order.installmentPlan).toEqual(first.body.order.installmentPlan)
    expect(second.body.order.history).toHaveLength(0)
  })
})

describe('RF-29, RF-32, RF-34 · requisições sem corpo', () => {
  it('cancelar pedido sem corpo devolve 422 REASON_REQUIRED', async () => {
    const order = await createOrder()
    const res = await api('POST', `/api/orders/${order.id}/cancel`)
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('REASON_REQUIRED')
  })

  it('emitir nota sem corpo devolve 422 com a mensagem do campo valor', async () => {
    const order = await orderWithTotal(1000)
    const res = await api('POST', `/api/orders/${order.id}/invoices`)
    expect(res.status).toBe(422)
    expect(res.body.error.fields.amountCents).toBe('Informe um valor maior que R$ 0,00.')
  })

  it('cancelar nota sem corpo devolve 422 REASON_REQUIRED e a nota continua emitida', async () => {
    const order = await orderWithTotal(1000)
    const issued = await issueInvoice(order.id, 1000)
    const res = await api('POST', `/api/invoices/${issued.body.invoice.id}/cancel`)
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('REASON_REQUIRED')
    const list = await api('GET', '/api/invoices')
    expect(list.body.invoices[0].status).toBe('issued')
  })
})
