/**
 * Apoio dos testes E2E: preparação de dados pela API e localizadores por papel e nome.
 * A preparação usa a API para que cada teste exercite pela tela só o que verifica.
 */
import type { APIRequestContext, Locator, Page } from '@playwright/test'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>

let sequence = 0

/** Código de produto único por execução (3 a 12 letras maiúsculas ou dígitos). */
export function uniqueCode(prefix = 'E2E'): string {
  sequence += 1
  return `${prefix}${Date.now().toString(36).slice(-5).toUpperCase()}${sequence}`
}

async function json(response: { json: () => Promise<unknown> }): Promise<Json> {
  return (await response.json()) as Json
}

/** Volta os defeitos ao valor de RETALHO_BUGS (todos desligados numa execução normal). */
export async function restoreBugs(request: APIRequestContext): Promise<void> {
  await request.delete('/api/qa/bugs')
}

export async function createProduct(request: APIRequestContext, fields: Json): Promise<Json> {
  const body = await json(
    await request.post('/api/products', { data: { code: uniqueCode(), ...fields } }),
  )
  return body.product
}

export async function productByCode(request: APIRequestContext, code: string): Promise<Json> {
  return (await json(await request.get(`/api/products?q=${code}`))).products[0]
}

/** Cliente da massa do seed. Ana Almeida tem CEP na área de entrega própria. */
export async function customerNamed(request: APIRequestContext, name = 'Ana Almeida') {
  return (await json(await request.get(`/api/customers?q=${encodeURIComponent(name)}`)))
    .customers[0]
}

export async function createDraft(
  request: APIRequestContext,
  items: [number, number][],
  conditions: Json = {},
): Promise<Json> {
  const customer = await customerNamed(request)
  const order = (
    await json(await request.post('/api/orders', { data: { customerId: customer.id } }))
  ).order
  for (const [productId, quantity] of items) {
    await request.post(`/api/orders/${order.id}/items`, { data: { productId, quantity } })
  }
  const updated = await request.put(`/api/orders/${order.id}`, {
    data: {
      customerId: customer.id,
      discountPct: 0,
      freightCents: 0,
      paymentMethod: 'pix',
      installments: 1,
      ...conditions,
    },
  })
  return (await json(updated)).order
}

export async function finalize(request: APIRequestContext, orderId: number): Promise<void> {
  await request.post(`/api/orders/${orderId}/finalize`)
}

export async function issueInvoice(request: APIRequestContext, orderId: number, cents: number) {
  return (
    await json(
      await request.post(`/api/orders/${orderId}/invoices`, { data: { amountCents: cents } }),
    )
  ).invoice
}

export async function getOrder(request: APIRequestContext, orderId: number): Promise<Json> {
  return (await json(await request.get(`/api/orders/${orderId}`))).order
}

/** Coluna de totais da tela do pedido. */
export function totals(page: Page): Locator {
  return page.getByRole('complementary', { name: 'Totais do pedido' })
}

/**
 * Valor de um resumo pelo seu termo. A ARIA não dá nome acessível a `term` e `definition`, então
 * o termo é localizado pelo papel e pelo texto, e o valor é a definição que vem logo depois dele.
 */
export function valueOf(scope: Page | Locator, term: string): Locator {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return scope
    .getByRole('term')
    .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) })
    .locator('xpath=following-sibling::dd[1]')
}

/** Leva o foco até o alvo só com Tab, como faria quem usa o teclado (RNF-05). */
export async function tabTo(page: Page, target: Locator, limit = 120): Promise<void> {
  for (let i = 0; i < limit; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error(`O alvo não foi alcançado com ${limit} toques em Tab`)
}

/** O elemento com foco mostra um contorno visível. */
export async function focusIsVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const element = document.activeElement
    if (!element) return false
    const style = getComputedStyle(element)
    return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
  })
}
