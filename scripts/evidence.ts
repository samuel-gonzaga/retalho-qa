/**
 * Evidências dos bug reports: reproduz cada defeito pela interface, como um testador faria, e
 * grava uma captura e os valores observados (CT-64, RNF-02).
 *
 * Uso: suba o build de produção com `RETALHO_QA_PAINEL=1` e uma massa recém-criada pelo seed,
 * depois rode `npx tsx scripts/evidence.ts [url-base] [pasta]`. Os defeitos são ligados um por
 * vez pela API da área de QA e desligados ao final.
 */
import { chromium, type Locator, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:3300'
const OUT = process.argv[3] ?? join('test-results', 'evidencias')

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type Observation = { bug: string; observed: Record<string, string>; mentionsDefect: boolean }

async function api(method: string, path: string, body?: unknown): Promise<Json> {
  const response = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return (await response.json()) as Json
}

const setBugs = (active: number[]) => api('PUT', '/api/qa/bugs', { active })

let sequence = 0
async function createProduct(fields: Json): Promise<Json> {
  sequence += 1
  return (await api('POST', '/api/products', { code: `EVD${sequence}`, ...fields })).product
}

/** Rascunho para um cliente de CEP local, com os itens e as condições indicadas. */
async function draft(items: [number, number][], conditions: Json = {}): Promise<number> {
  const customer = (await api('GET', '/api/customers?q=Ana Almeida')).customers[0]
  const order = (await api('POST', '/api/orders', { customerId: customer.id })).order
  for (const [productId, quantity] of items) {
    await api('POST', `/api/orders/${order.id}/items`, { productId, quantity })
  }
  await api('PUT', `/api/orders/${order.id}`, {
    customerId: customer.id,
    discountPct: 0,
    freightCents: 0,
    paymentMethod: 'pix',
    installments: 1,
    ...conditions,
  })
  return order.id
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
}

const totalOf = (page: Page) => page.locator('aside dt:text-is("Total") + dd').innerText()
const text = async (locator: Locator) => (await locator.innerText()).replace(/\s+/g, ' ').trim()

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'pt-BR',
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const observations: Observation[] = []

  async function record(bug: string, observed: Record<string, string>, shot: Locator) {
    const mentionsDefect = /defeito|\bbug\b/i.test(await page.locator('main').innerText())
    await shot.screenshot({ path: join(OUT, `${bug}.png`) })
    observations.push({ bug, observed, mentionsDefect })
    console.log(bug, JSON.stringify(observed), mentionsDefect ? '· TELA MENCIONA DEFEITO' : '')
  }

  await setBugs([])

  {
    // BUG-01: aplicar o desconto e depois editar a quantidade.
    const fabric = await createProduct({ name: 'Tricoline Lisa', unit: 'meter', priceCents: 5000 })
    const id = await draft([[fabric.id, 50]], { discountPct: 10 })
    await page.goto(`${BASE}/pedidos/${id}`)
    await settle(page)
    const before = await totalOf(page)
    await setBugs([1])
    await page.getByLabel('Quantidade de Tricoline Lisa', { exact: true }).fill('100')
    await page.getByRole('button', { name: 'Salvar quantidade de Tricoline Lisa' }).click()
    await settle(page)
    await record(
      'BUG-01',
      { pedido: String(id), totalAntes: before, totalDepois: await totalOf(page) },
      page.locator('main'),
    )
  }

  {
    // BUG-02: rolo com 4 unidades e depois com 1 (mascaramento).
    const roll = (await api('GET', '/api/products?q=ROL2001')).products[0]
    await setBugs([2])
    const id = await draft([[roll.id, 4]])
    await page.goto(`${BASE}/pedidos/${id}`)
    await settle(page)
    const fourRolls = await text(page.getByRole('row', { name: /Entretela/ }))
    await record(
      'BUG-02',
      { pedido: String(id), linhaCom4Rolos: fourRolls },
      page.getByRole('region', { name: 'Itens' }),
    )
    await page.getByLabel('Quantidade de Entretela Termocolante', { exact: true }).fill('1')
    await page.getByRole('button', { name: 'Salvar quantidade de Entretela Termocolante' }).click()
    await settle(page)
    await record(
      'BUG-02-mascarado',
      {
        pedido: String(id),
        linhaCom1Rolo: await text(page.getByRole('row', { name: /Entretela/ })),
      },
      page.getByRole('region', { name: 'Itens' }),
    )
  }

  {
    // BUG-03: tela desatualizada numa aba salva condições de um pedido faturado na outra.
    const box = await createProduct({ name: 'Retalho Avulso', unit: 'unit', priceCents: 30000 })
    const id = await draft([[box.id, 1]])
    await setBugs([3])
    await page.goto(`${BASE}/pedidos/${id}`)
    await settle(page)
    const other = await context.newPage()
    await other.goto(`${BASE}/pedidos/${id}`)
    await settle(other)
    await other.getByRole('button', { name: 'Finalizar pedido' }).click()
    await other.getByRole('button', { name: 'Emitir nota' }).click()
    await other.getByText(/Nota NI \d+ emitida/).waitFor()
    await other.close()
    await page.getByLabel('Desconto global (%)').fill('50')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await settle(page)
    await page.reload()
    await settle(page)
    const status = await text(page.locator('h1 + div, h1 + p').first())
    await record(
      'BUG-03',
      { pedido: String(id), cabecalho: status, totalDepois: await totalOf(page) },
      page.locator('main'),
    )
  }

  {
    // BUG-04: R$ 100,00 em 3 parcelas.
    const kit = await createProduct({ name: 'Kit de Amostras', unit: 'unit', priceCents: 10000 })
    await setBugs([4])
    const id = await draft([[kit.id, 1]], { installments: 3 })
    await page.goto(`${BASE}/pedidos/${id}`)
    await settle(page)
    await record(
      'BUG-04',
      {
        pedido: String(id),
        total: await totalOf(page),
        parcelas: await text(page.locator('aside ol')),
      },
      page.locator('aside'),
    )
  }

  {
    // BUG-05: cancelar a segunda nota de um pedido faturado.
    const box = await createProduct({
      name: 'Caixa de Aviamentos',
      unit: 'unit',
      priceCents: 30000,
    })
    const id = await draft([[box.id, 1]])
    await api('POST', `/api/orders/${id}/finalize`)
    await api('POST', `/api/orders/${id}/invoices`, { amountCents: 10000 })
    const second = await api('POST', `/api/orders/${id}/invoices`, { amountCents: 20000 })
    await setBugs([5])
    await page.goto(`${BASE}/pedidos/${id}`)
    await settle(page)
    const number = String(second.invoice.number).padStart(4, '0')
    await page.getByRole('button', { name: `Cancelar nota NI ${number}` }).click()
    await page.getByRole('dialog').getByLabel('Motivo').fill('Nota emitida em duplicidade')
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar nota' }).click()
    await settle(page)
    const region = page.getByRole('region', { name: 'Faturamento' })
    const summary = await text(region.locator('dl').first())
    const status = await text(page.locator('h1 + div, h1 + p').first())
    await record('BUG-05', { pedido: String(id), cabecalho: status, resumo: summary }, region)
  }

  {
    // BUG-06: painel aberto antes de emitir uma nota.
    await setBugs([6])
    await page.goto(`${BASE}/`)
    await settle(page)
    const dashboardBefore = await page.locator('dt:text-is("Faturado") + dd').first().innerText()
    await page.goto(`${BASE}/faturamento`)
    await settle(page)
    const first = page.getByRole('region', { name: 'Pedidos a faturar' }).locator('li').first()
    await first.getByLabel(/Valor da nota/).fill('100,00')
    await first.getByRole('button', { name: 'Emitir nota' }).click()
    await settle(page)
    const listTotal = await page
      .getByText('Total faturado')
      .locator('xpath=following-sibling::div')
      .innerText()
    await page
      .locator('main > div')
      .first()
      .screenshot({ path: join(OUT, 'BUG-06-faturamento.png') })
    await page.goto(`${BASE}/`)
    await settle(page)
    await record(
      'BUG-06',
      {
        painelAntes: dashboardBefore,
        painelDepois: await page.locator('dt:text-is("Faturado") + dd').first().innerText(),
        listaDeNotas: listTotal,
      },
      page.locator('main'),
    )
  }

  {
    // BUG-07: o botão que salva as condições do pedido.
    await setBugs([7])
    const orderId = (await api('GET', '/api/orders?status=draft')).orders[0].id
    await page.goto(`${BASE}/pedidos/${orderId}`)
    await settle(page)
    // O último botão da seção Condições é o que grava o cabeçalho do pedido.
    const save = page.getByRole('region', { name: 'Condições' }).getByRole('button').last()
    await save.scrollIntoViewIfNeeded()
    await record(
      'BUG-07',
      {
        pedido: String(orderId),
        rotulo: await save.innerText(),
        ariaKeyshortcuts: String(await save.getAttribute('aria-keyshortcuts')),
      },
      page.getByRole('region', { name: 'Condições' }),
    )
  }

  await setBugs([])
  await browser.close()
  writeFileSync(join(OUT, 'evidencias.json'), JSON.stringify(observations, null, 2))
  const loud = observations.filter((o) => o.mentionsDefect).map((o) => o.bug)
  console.log(
    loud.length
      ? `Telas que mencionam defeito: ${loud.join(', ')}`
      : 'Nenhuma tela menciona defeito (RNF-02).',
  )
}

void main()
