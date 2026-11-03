/**
 * Chama as rotas da API dentro do processo, sem servidor HTTP, com um banco em memória novo a
 * cada teste (RNF-04).
 */
import { beforeEach } from 'vitest'
import * as customer from '@/app/api/customers/[id]/route'
import * as customers from '@/app/api/customers/route'
import * as dashboard from '@/app/api/dashboard/route'
import * as invoiceCancel from '@/app/api/invoices/[id]/cancel/route'
import * as invoices from '@/app/api/invoices/route'
import * as orderCancel from '@/app/api/orders/[id]/cancel/route'
import * as orderFinalize from '@/app/api/orders/[id]/finalize/route'
import * as orderInvoices from '@/app/api/orders/[id]/invoices/route'
import * as orderItem from '@/app/api/orders/[id]/items/[itemId]/route'
import * as orderItems from '@/app/api/orders/[id]/items/route'
import * as order from '@/app/api/orders/[id]/route'
import * as orders from '@/app/api/orders/route'
import * as product from '@/app/api/products/[id]/route'
import * as products from '@/app/api/products/route'
import * as qaBugs from '@/app/api/qa/bugs/route'
import { resetDatabase } from '@/db/client'
import { cpfCheckDigits } from '@/domain/documents'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type Context = { params: Promise<Record<string, string>> }
type Handler = (request: Request, context: Context) => Promise<Response> | Response
type RouteModule = Partial<Record<Method, Handler>>

const ROUTES: [string, unknown][] = [
  ['/api/products', products],
  ['/api/products/:id', product],
  ['/api/customers', customers],
  ['/api/customers/:id', customer],
  ['/api/orders', orders],
  ['/api/orders/:id', order],
  ['/api/orders/:id/items', orderItems],
  ['/api/orders/:id/items/:itemId', orderItem],
  ['/api/orders/:id/finalize', orderFinalize],
  ['/api/orders/:id/cancel', orderCancel],
  ['/api/orders/:id/invoices', orderInvoices],
  ['/api/invoices', invoices],
  ['/api/invoices/:id/cancel', invoiceCancel],
  ['/api/dashboard', dashboard],
  ['/api/qa/bugs', qaBugs],
]

function match(pathname: string): { module: RouteModule; params: Record<string, string> } {
  const parts = pathname.split('/')
  for (const [pattern, module] of ROUTES) {
    const expected = pattern.split('/')
    if (expected.length !== parts.length) continue
    const params: Record<string, string> = {}
    const ok = expected.every((segment, i) => {
      if (segment.startsWith(':')) params[segment.slice(1)] = parts[i] ?? ''
      return segment.startsWith(':') || segment === parts[i]
    })
    if (ok) return { module: module as RouteModule, params }
  }
  throw new Error(`Rota sem handler no helper de testes: ${pathname}`)
}

// Corpo das respostas JSON; os testes leem campos conhecidos do contrato (SPEC 10).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = Record<string, any>

export type ApiResponse = { status: number; body: Json }

export async function api(
  method: Method,
  path: string,
  body?: unknown,
  options: { raw?: string } = {},
): Promise<ApiResponse> {
  const url = new URL(path, 'http://retalho.test')
  const { module, params } = match(url.pathname)
  const handler = module[method]
  if (!handler) throw new Error(`${method} não existe em ${url.pathname}`)
  const payload = options.raw ?? (body === undefined ? undefined : JSON.stringify(body))
  const request = new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: payload,
  })
  const response = await handler(request, { params: Promise.resolve(params) })
  return { status: response.status, body: (await response.json()) as Json }
}

export function withFreshDatabase(): void {
  beforeEach(() => {
    resetDatabase()
  })
}

/** Documentos fictícios com dígitos verificadores válidos (bases de π, e e φ). */
export const DOCS = {
  cpf1: '314.159.265-90',
  cpf2: '271.828.182-05',
  cpf3: '161.803.398-05',
  cnpj1: '12.ABC.345/01DE-35',
  cnpj2: '31.415.926/0001-71',
} as const

export const LOCAL_CEP = '01000-000'
export const OUTSIDE_CEP = '20000-000'

let sequence = 0

/** CPF fictício único por chamada, para a massa dos testes (não testa o validador). */
function fixtureCpf(n: number): string {
  const base = String(200_000_000 + n)
  return base + cpfCheckDigits(base)
}

export async function createCustomer(overrides: Json = {}): Promise<Json> {
  sequence += 1
  const res = await api('POST', '/api/customers', {
    type: 'PF',
    name: `Cliente Exemplo ${sequence}`,
    document: fixtureCpf(sequence),
    cep: LOCAL_CEP,
    ...overrides,
  })
  if (res.status !== 201) throw new Error(`Cliente não criado: ${JSON.stringify(res.body)}`)
  return res.body.customer
}

export async function createProduct(overrides: Json = {}): Promise<Json> {
  sequence += 1
  const res = await api('POST', '/api/products', {
    code: `PRD${sequence}`,
    name: `Produto ${sequence}`,
    unit: 'unit',
    priceCents: 1000,
    ...overrides,
  })
  if (res.status !== 201) throw new Error(`Produto não criado: ${JSON.stringify(res.body)}`)
  return res.body.product
}

export async function createOrder(customerId?: number): Promise<Json> {
  const id = customerId ?? (await createCustomer()).id
  const res = await api('POST', '/api/orders', { customerId: id })
  if (res.status !== 201) throw new Error(`Pedido não criado: ${JSON.stringify(res.body)}`)
  return res.body.order
}

export async function addItem(orderId: number, productId: number, quantity: number) {
  return api('POST', `/api/orders/${orderId}/items`, { productId, quantity })
}

export function header(order: Json, changes: Json = {}): Json {
  return {
    customerId: order.customer.id,
    discountPct: order.discountPct,
    freightCents: order.freightCents,
    paymentMethod: order.paymentMethod,
    installments: order.installments,
    ...changes,
  }
}

/** Pedido com um item avulso cujo total é exatamente `totalCents` (sem desconto nem frete). */
export async function orderWithTotal(totalCents: number, finalize = true): Promise<Json> {
  const product = await createProduct({ priceCents: totalCents })
  const created = await createOrder()
  const added = await addItem(created.id, product.id, 1)
  if (!finalize) return added.body.order
  const res = await api('POST', `/api/orders/${created.id}/finalize`)
  return res.body.order
}

export async function issueInvoice(orderId: number, amountCents: number) {
  return api('POST', `/api/orders/${orderId}/invoices`, { amountCents })
}

export async function cancelInvoice(invoiceId: number, reason = 'Nota emitida com valor errado') {
  return api('POST', `/api/invoices/${invoiceId}/cancel`, { reason })
}
