import { describe, expect, it } from 'vitest'
import { api, cancelInvoice, issueInvoice, orderWithTotal, useFreshDatabase } from './helpers'

useFreshDatabase()

async function dashboard() {
  return (await api('GET', '/api/dashboard')).body
}

describe('RF-36 · vendido', () => {
  it('soma finalizados, parcialmente faturados e faturados; ignora rascunho e cancelado', async () => {
    await orderWithTotal(5000, false)
    const canceled = await orderWithTotal(7000)
    await api('POST', `/api/orders/${canceled.id}/cancel`, { reason: 'Cliente desistiu da compra' })
    await orderWithTotal(10_000)
    const invoiced = await orderWithTotal(30_000)
    await issueInvoice(invoiced.id, 30_000)

    expect(await dashboard()).toEqual({
      soldCents: 40_000,
      invoicedCents: 30_000,
      toInvoiceCents: 10_000,
    })
  })
})

describe('RF-37, RF-39 · faturado igual à lista e painel sempre atualizado', () => {
  it('[BUG-06] depois de emitir e cancelar notas, painel e lista mostram o mesmo faturado', async () => {
    const order = await orderWithTotal(30_000)
    expect((await dashboard()).invoicedCents).toBe(0)

    const issued = await issueInvoice(order.id, 10_000)
    const afterIssue = await dashboard()
    expect(afterIssue).toMatchObject({ invoicedCents: 10_000, toInvoiceCents: 20_000 })
    expect(afterIssue.invoicedCents).toBe(
      (await api('GET', '/api/invoices')).body.totalInvoicedCents,
    )

    await cancelInvoice(issued.body.invoice.id)
    expect((await dashboard()).invoicedCents).toBe(0)
  })
})

describe('RF-38 · vendido = faturado + a faturar', () => {
  it('[BUG-05] a igualdade vale depois de emitir e cancelar notas', async () => {
    const a = await orderWithTotal(30_000)
    const b = await orderWithTotal(12_345)
    await issueInvoice(a.id, 10_000)
    const second = await issueInvoice(a.id, 20_000)
    await issueInvoice(b.id, 345)
    await cancelInvoice(second.body.invoice.id)

    const { soldCents, invoicedCents, toInvoiceCents } = await dashboard()
    expect(soldCents).toBe(42_345)
    expect(invoicedCents + toInvoiceCents).toBe(soldCents)
  })
})
