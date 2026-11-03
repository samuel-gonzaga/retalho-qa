import { describe, expect, it } from 'vitest'
import { FIELD_MESSAGES as M } from '@/domain/messages'
import {
  addItem,
  api,
  createCustomer,
  createOrder,
  createProduct,
  header,
  issueInvoice,
  OUTSIDE_CEP,
  orderWithTotal,
  useFreshDatabase,
} from './helpers'

useFreshDatabase()

async function invoicedOrder() {
  const order = await orderWithTotal(30_000)
  await issueInvoice(order.id, 30_000)
  return (await api('GET', `/api/orders/${order.id}`)).body.order
}

describe('RF-12, RF-13 · criar e listar pedidos', () => {
  it('cria em rascunho com desconto 0 %, frete R$ 0,00, Pix e 1 parcela', async () => {
    const customer = await createCustomer()
    const res = await api('POST', '/api/orders', { customerId: customer.id })
    expect(res.status).toBe(201)
    expect(res.body.order).toMatchObject({
      number: 1,
      status: 'draft',
      discountPct: 0,
      freightCents: 0,
      paymentMethod: 'pix',
      installments: 1,
      totalCents: 0,
    })
  })

  it('recusa cliente inexistente com 422', async () => {
    const res = await api('POST', '/api/orders', { customerId: 999 })
    expect(res.status).toBe(422)
    expect(res.body.error.fields.customerId).toBe(M.customer)
  })

  it('filtra a lista por estado, do mais recente para o mais antigo', async () => {
    const draft = await createOrder()
    const finalized = await orderWithTotal(1000)
    const newerDraft = await createOrder()
    const all = await api('GET', '/api/orders')
    expect(all.body.orders.map((o: { id: number }) => o.id)).toEqual([
      newerDraft.id,
      finalized.id,
      draft.id,
    ])
    const onlyFinalized = await api('GET', '/api/orders?status=finalized')
    expect(onlyFinalized.body.orders.map((o: { id: number }) => o.id)).toEqual([finalized.id])
    expect((await api('GET', '/api/orders?status=pago')).status).toBe(422)
  })
})

describe('RF-14 a RF-16 · itens do pedido', () => {
  it('inclui item, recalcula os totais e recusa o mesmo produto duas vezes', async () => {
    const product = await createProduct({ unit: 'meter', priceCents: 1299 })
    const order = await createOrder()
    const added = await addItem(order.id, product.id, 2.35)
    expect(added.status).toBe(201)
    expect(added.body.order).toMatchObject({ subtotalCents: 3053, totalCents: 3053 })
    expect(added.body.order.items[0]).toMatchObject({ quantity: 2.35, unitPriceCents: 1299 })

    const duplicate = await addItem(order.id, product.id, 1)
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.code).toBe('DUPLICATE_ITEM')
  })

  it('recusa produto inexistente com 422', async () => {
    const order = await createOrder()
    const res = await addItem(order.id, 999, 1)
    expect(res.status).toBe(422)
    expect(res.body.error.fields.productId).toBe(M.product)
  })

  it.each([
    ['metro', 'meter', 0, M.quantityRange],
    ['metro', 'meter', 1000.01, M.quantityRange],
    ['metro', 'meter', 1.255, M.quantityDecimals],
    ['rolo', 'roll', 1.5, M.quantityInteger],
  ])('RF-15 · %s com quantidade %d devolve 422', async (_, unit, quantity, message) => {
    const product = await createProduct({ unit, rollLength: unit === 'roll' ? 5 : undefined })
    const order = await createOrder()
    const res = await addItem(order.id, product.id, quantity)
    expect(res.status).toBe(422)
    expect(res.body.error.fields.quantity).toBe(message)
  })

  it('[BUG-02] rolo de 5 m a R$ 4,00/m com quantidade 4: unitário R$ 20,00 e total R$ 80,00', async () => {
    const roll = await createProduct({ unit: 'roll', priceCents: 400, rollLength: 5 })
    const order = await createOrder()
    const res = await addItem(order.id, roll.id, 4)
    expect(res.body.order.items[0]).toMatchObject({ unitPriceCents: 2000, totalCents: 8000 })
  })
})

describe('RF-17 · editar quantidade e remover item', () => {
  it('[BUG-01] reaplica o desconto global depois de editar a quantidade', async () => {
    const product = await createProduct({ unit: 'meter', priceCents: 5000 })
    const order = await createOrder()
    const added = await addItem(order.id, product.id, 50)
    await api('PUT', `/api/orders/${order.id}`, header(order, { discountPct: 10 }))
    const before = await api('GET', `/api/orders/${order.id}`)
    expect(before.body.order).toMatchObject({ totalCents: 225_000, freeShipping: true })

    const itemId = added.body.order.items[0].id
    const edited = await api('PATCH', `/api/orders/${order.id}/items/${itemId}`, { quantity: 100 })
    expect(edited.status).toBe(200)
    expect(edited.body.order).toMatchObject({
      subtotalCents: 500_000,
      discountCents: 50_000,
      totalCents: 450_000,
    })
  })

  it('remover o item zera o subtotal e deixa só o frete cobrado', async () => {
    const product = await createProduct()
    const order = await createOrder()
    const added = await addItem(order.id, product.id, 1)
    await api('PUT', `/api/orders/${order.id}`, header(order, { freightCents: 1500 }))
    const itemId = added.body.order.items[0].id
    const res = await api('DELETE', `/api/orders/${order.id}/items/${itemId}`)
    expect(res.status).toBe(200)
    expect(res.body.order).toMatchObject({ items: [], subtotalCents: 0, totalCents: 1500 })
  })
})

describe('RF-18 a RF-23 · cabeçalho, frete e parcelas', () => {
  it('RF-21 · com boleto o frete informado é cobrado', async () => {
    const product = await createProduct({ priceCents: 500_000 })
    const order = await createOrder()
    await addItem(order.id, product.id, 1)
    const pix = await api(
      'PUT',
      `/api/orders/${order.id}`,
      header(order, { discountPct: 10, freightCents: 5000 }),
    )
    expect(pix.body.order).toMatchObject({ freeShipping: true, totalCents: 450_000 })
    const boleto = await api(
      'PUT',
      `/api/orders/${order.id}`,
      header(order, { discountPct: 10, freightCents: 5000, paymentMethod: 'boleto' }),
    )
    expect(boleto.body.order).toMatchObject({
      freeShipping: false,
      freightChargedCents: 5000,
      totalCents: 455_000,
    })
  })

  it('RF-18 · desconto de 101 % devolve 422 sem alterar o pedido', async () => {
    const order = await createOrder()
    const res = await api('PUT', `/api/orders/${order.id}`, header(order, { discountPct: 101 }))
    expect(res.status).toBe(422)
    expect(res.body.error.fields.discountPct).toBe(M.discount)
    expect((await api('GET', `/api/orders/${order.id}`)).body.order.discountPct).toBe(0)
  })

  it('[BUG-04] R$ 100,00 em 3 parcelas: R$ 33,33 + R$ 33,33 + R$ 33,34', async () => {
    const order = await orderWithTotal(10_000, false)
    const res = await api('PUT', `/api/orders/${order.id}`, header(order, { installments: 3 }))
    expect(
      res.body.order.installmentPlan.map((p: { amountCents: number }) => p.amountCents),
    ).toEqual([3333, 3333, 3334])
  })

  it('RNF-11 · corpo que não é JSON devolve 400', async () => {
    const order = await createOrder()
    const res = await api('PUT', `/api/orders/${order.id}`, undefined, { raw: '{desconto' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_JSON')
  })
})

describe('RF-24 · valores congelados na finalização', () => {
  it('mudar o CEP do cliente depois de finalizar não muda o frete nem o total', async () => {
    const customer = await createCustomer()
    const product = await createProduct({ priceCents: 40_000 })
    const order = await createOrder(customer.id)
    await addItem(order.id, product.id, 1)
    await api('PUT', `/api/orders/${order.id}`, header(order, { freightCents: 2000 }))
    const finalized = await api('POST', `/api/orders/${order.id}/finalize`)
    expect(finalized.body.order).toMatchObject({ freeShipping: true, totalCents: 40_000 })

    await api('PUT', `/api/customers/${customer.id}`, {
      type: customer.type,
      name: customer.name,
      document: customer.document,
      cep: OUTSIDE_CEP,
    })
    const after = await api('GET', `/api/orders/${order.id}`)
    expect(after.body.order).toMatchObject({ freeShipping: true, totalCents: 40_000 })
  })
})

describe('RF-26, RF-27 · alterações só em rascunho', () => {
  it('[BUG-03] PUT em pedido faturado devolve 409 e o total não muda', async () => {
    const order = await invoicedOrder()
    const res = await api('PUT', `/api/orders/${order.id}`, header(order, { discountPct: 50 }))
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('ORDER_NOT_EDITABLE')
    const after = await api('GET', `/api/orders/${order.id}`)
    expect(after.body.order.totalCents).toBe(order.totalCents)
  })

  it('PUT e itens em pedido finalizado devolvem 409', async () => {
    const order = await orderWithTotal(1000)
    const product = await createProduct()
    expect((await api('PUT', `/api/orders/${order.id}`, header(order))).status).toBe(409)
    expect((await addItem(order.id, product.id, 1)).status).toBe(409)
    const itemId = order.items[0].id
    const patch = await api('PATCH', `/api/orders/${order.id}/items/${itemId}`, { quantity: 2 })
    expect(patch.status).toBe(409)
    expect((await api('DELETE', `/api/orders/${order.id}/items/${itemId}`)).status).toBe(409)
  })

  it('incluir item em pedido faturado devolve 409', async () => {
    const order = await invoicedOrder()
    const product = await createProduct()
    const res = await addItem(order.id, product.id, 1)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('ORDER_NOT_EDITABLE')
  })
})

describe('RF-28 · finalizar pedido', () => {
  it('sem itens devolve 422 ORDER_INCOMPLETE', async () => {
    const order = await createOrder()
    const res = await api('POST', `/api/orders/${order.id}/finalize`)
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('ORDER_INCOMPLETE')
  })

  it('duplo clique: duas chamadas simultâneas devolvem 200 e geram um só registro', async () => {
    const order = await orderWithTotal(1000, false)
    const [first, second] = await Promise.all([
      api('POST', `/api/orders/${order.id}/finalize`),
      api('POST', `/api/orders/${order.id}/finalize`),
    ])
    expect([first.status, second.status]).toEqual([200, 200])
    const after = await api('GET', `/api/orders/${order.id}`)
    expect(after.body.order.status).toBe('finalized')
    expect(after.body.order.history).toHaveLength(1)
    expect(after.body.order.balanceCents).toBe(1000)
  })
})

describe('RF-29 · cancelar pedido', () => {
  it.each([
    ['vazio', ''],
    ['com 9 caracteres', 'x'.repeat(9)],
    ['só com espaços', '            '],
  ])('motivo %s devolve 422 REASON_REQUIRED', async (_, reason) => {
    const order = await createOrder()
    const res = await api('POST', `/api/orders/${order.id}/cancel`, { reason })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('REASON_REQUIRED')
  })

  it('cancela com motivo; repetir devolve 200 e mantém o motivo original', async () => {
    const order = await orderWithTotal(1000)
    const first = await api('POST', `/api/orders/${order.id}/cancel`, {
      reason: 'Cliente desistiu da compra',
    })
    expect(first.status).toBe(200)
    expect(first.body.order).toMatchObject({
      status: 'canceled',
      cancelReason: 'Cliente desistiu da compra',
    })
    const again = await api('POST', `/api/orders/${order.id}/cancel`, {
      reason: 'Outro motivo aqui',
    })
    expect(again.status).toBe(200)
    expect(again.body.order.cancelReason).toBe('Cliente desistiu da compra')
    expect(again.body.order.history).toHaveLength(2)
  })

  it('pedido faturado devolve 409 e orienta cancelar as notas antes', async () => {
    const order = await invoicedOrder()
    const res = await api('POST', `/api/orders/${order.id}/cancel`, {
      reason: 'Cliente desistiu da compra',
    })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INVALID_TRANSITION')
    expect(res.body.error.message).toContain('Cancele as notas emitidas')
  })
})

describe('RF-31 · ordem de verificação dos erros', () => {
  it('[BUG-03] desconto de 101 % em pedido faturado devolve 409, não 422', async () => {
    const order = await invoicedOrder()
    const res = await api('PUT', `/api/orders/${order.id}`, header(order, { discountPct: 101 }))
    expect(res.status).toBe(409)
  })

  it('pedido inexistente devolve 404, qualquer que seja o corpo', async () => {
    expect((await api('PUT', '/api/orders/999', undefined, { raw: 'abc' })).status).toBe(404)
    expect((await api('POST', '/api/orders/999/finalize')).status).toBe(404)
    expect((await api('PATCH', '/api/orders/999/items/1', { quantity: 1 })).status).toBe(404)
  })
})
