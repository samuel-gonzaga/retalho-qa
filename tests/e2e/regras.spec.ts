import { expect, test } from '@playwright/test'
import { announcesReservedShortcut } from '@/domain/labels'
import {
  createDraft,
  createProduct,
  finalize,
  issueInvoice,
  productByCode,
  restoreBugs,
  totals,
  valueOf,
} from './apoio'

test.beforeEach(async ({ request }) => {
  await restoreBugs(request)
})

test.describe('regras do pedido na tela', () => {
  test('[BUG-01] RF-17 · editar a quantidade mantém o desconto global', async ({
    page,
    request,
  }) => {
    const fabric = await createProduct(request, {
      name: 'Tricoline E2E',
      unit: 'meter',
      priceCents: 5000,
    })
    const order = await createDraft(request, [[fabric.id, 50]], { discountPct: 10 })
    await page.goto(`/pedidos/${order.id}`)
    await expect(valueOf(totals(page), 'Total')).toHaveText('R$ 2.250,00')

    await page.getByLabel('Quantidade de Tricoline E2E', { exact: true }).fill('100')
    await page.getByRole('button', { name: 'Salvar quantidade de Tricoline E2E' }).click()
    await expect(valueOf(totals(page), 'Subtotal')).toHaveText('R$ 5.000,00')
    await expect(valueOf(totals(page), 'Desconto (10 %)')).toHaveText(/R\$ 500,00/)
    await expect(valueOf(totals(page), 'Total')).toHaveText('R$ 4.500,00')
  })

  test('[BUG-02] RF-16 · rolo com 4 unidades mostra o preço do rolo', async ({ page, request }) => {
    const roll = await productByCode(request, 'ROL2001')
    const order = await createDraft(request, [[roll.id, 4]])
    await page.goto(`/pedidos/${order.id}`)
    const row = page.getByRole('row').filter({ hasText: 'Entretela Termocolante' })
    await expect(row).toContainText('R$ 20,00/rolo')
    await expect(row).toContainText('R$ 80,00')
  })

  test('[BUG-04] RF-23 · R$ 100,00 em 3 parcelas fecha o total', async ({ page, request }) => {
    const kit = await createProduct(request, {
      name: 'Kit de Amostras E2E',
      unit: 'unit',
      priceCents: 10_000,
    })
    const order = await createDraft(request, [[kit.id, 1]], { installments: 3 })
    await page.goto(`/pedidos/${order.id}`)
    await expect(totals(page).getByRole('listitem')).toHaveText([
      /R\$ 33,33/,
      /R\$ 33,33/,
      /R\$ 33,34/,
    ])
  })
})

test.describe('faturamento e painel na tela', () => {
  test('[BUG-05] RF-34 · cancelar nota devolve o saldo ao pedido', async ({ page, request }) => {
    const box = await createProduct(request, {
      name: 'Caixa E2E',
      unit: 'unit',
      priceCents: 30_000,
    })
    const order = await createDraft(request, [[box.id, 1]])
    await finalize(request, order.id)
    await issueInvoice(request, order.id, 10_000)
    const second = await issueInvoice(request, order.id, 20_000)
    await page.goto(`/pedidos/${order.id}`)

    const number = `NI ${String(second.number).padStart(4, '0')}`
    await page.getByRole('button', { name: `Cancelar nota ${number}` }).click()
    const dialog = page.getByRole('dialog', { name: `Cancelar nota ${number}` })
    await dialog.getByLabel('Motivo').fill('Nota emitida em duplicidade')
    await dialog.getByRole('button', { name: 'Cancelar nota' }).click()
    await expect(dialog).toBeHidden()

    const billing = page.getByRole('region', { name: 'Faturamento' })
    await expect(valueOf(billing, 'Saldo a faturar')).toHaveText('R$ 200,00')
    await expect(
      page.getByRole('main').getByText('Parcialmente faturado', { exact: true }).first(),
    ).toBeVisible()
  })

  test('[BUG-06] RF-37 · painel e faturamento mostram o mesmo faturado', async ({
    page,
    request,
  }) => {
    const box = await createProduct(request, { name: 'Peça E2E', unit: 'unit', priceCents: 30_000 })
    const order = await createDraft(request, [[box.id, 1]])
    await finalize(request, order.id)

    // O painel é aberto antes da nota: é assim que o cache fica desatualizado.
    await page.goto('/')
    await expect(valueOf(page, 'Faturado')).toBeVisible()

    await page.goto('/faturamento')
    const pending = page
      .getByRole('region', { name: 'Pedidos a faturar' })
      .getByRole('listitem')
      .filter({ hasText: `Pedido nº ${order.number}` })
    await pending.getByLabel(/Valor da nota/).fill('100,00')
    await pending.getByRole('button', { name: 'Emitir nota' }).click()
    await expect(page.getByText(/Nota NI \d+ emitida/)).toBeVisible()
    const listTotal = await valueOf(page, 'Total faturado').innerText()

    await page.goto('/')
    await expect(valueOf(page, 'Faturado')).toHaveText(listTotal)
  })
})

test('[BUG-07] RF-40 · nenhum botão anuncia atalho reservado do navegador', async ({
  page,
  request,
}) => {
  const order = await createDraft(request, [])
  const pages = [
    '/',
    '/pedidos',
    '/pedidos/novo',
    `/pedidos/${order.id}`,
    '/faturamento',
    '/produtos',
    '/produtos/novo',
    '/clientes',
    '/clientes/novo',
    '/qa/defeitos',
  ]
  for (const path of pages) {
    await page.goto(path)
    const labels = await page
      .getByRole('button')
      .evaluateAll((buttons) =>
        buttons.map((button) =>
          [
            button.textContent ?? '',
            button.getAttribute('title') ?? '',
            button.getAttribute('aria-keyshortcuts') ?? '',
          ].join(' '),
        ),
      )
    const offending = labels.filter((label) => announcesReservedShortcut(label))
    expect(offending, `botões com atalho reservado em ${path}`).toEqual([])
  }
  await page.goto(`/pedidos/${order.id}`)
  const save = page.getByRole('region', { name: 'Condições' }).getByRole('button').last()
  await expect(save).toHaveAccessibleName('Salvar')
  await expect(save).not.toHaveAttribute('aria-keyshortcuts')
})
