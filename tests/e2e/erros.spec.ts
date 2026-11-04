import { expect, test } from '@playwright/test'
import {
  createDraft,
  createProduct,
  finalize,
  getOrder,
  issueInvoice,
  restoreBugs,
  saveConditionsButton,
  valueOf,
} from './apoio'

test.beforeEach(async ({ request }) => {
  await restoreBugs(request)
})

test.describe('fluxos de erro', () => {
  test('RF-29 · cancelar pedido sem motivo mostra a mensagem e não cancela', async ({
    page,
    request,
  }) => {
    const order = await createDraft(request, [])
    await page.goto(`/pedidos/${order.id}`)

    await page.getByRole('button', { name: 'Cancelar pedido' }).click()
    const dialog = page.getByRole('dialog', { name: `Cancelar pedido nº ${order.number}` })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancelar pedido' }).click()

    const reason = dialog.getByLabel('Motivo')
    await expect(reason).toHaveAttribute('aria-invalid', 'true')
    await expect(reason).toHaveAccessibleDescription(
      /Informe o motivo do cancelamento, com 10 a 200 caracteres\./,
    )
    await dialog.getByRole('button', { name: 'Voltar' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('main').getByText('Rascunho', { exact: true })).toBeVisible()
    expect((await getOrder(request, order.id)).status).toBe('draft')
  })

  test('RF-32 · nota acima do saldo mostra o saldo disponível e não emite', async ({
    page,
    request,
  }) => {
    const item = await createProduct(request, {
      name: 'Retalho Grande',
      unit: 'unit',
      priceCents: 10_000,
    })
    const order = await createDraft(request, [[item.id, 1]])
    await finalize(request, order.id)
    await page.goto(`/pedidos/${order.id}`)

    const amount = page.getByLabel(/Valor da nota/)
    await amount.fill('100,01')
    await page.getByRole('button', { name: 'Emitir nota' }).click()

    await expect(amount).toHaveAttribute('aria-invalid', 'true')
    await expect(amount).toHaveAccessibleDescription(
      /O valor da nota \(R\$ 100,01\) passa do saldo a faturar \(R\$ 100,00\)\. Informe até R\$ 100,00\./,
    )
    const billing = page.getByRole('region', { name: 'Faturamento' })
    await expect(valueOf(billing, 'Faturado')).toHaveText('R$ 0,00')
    await expect(billing.getByRole('table')).toHaveCount(0)
  })

  test('RF-07 · CPF com dígito errado mostra a mensagem no campo e não cadastra', async ({
    page,
    request,
  }) => {
    await page.goto('/clientes/novo')
    await page.getByLabel('Nome').fill('Cliente Teste E2E')
    await page.getByLabel('CPF').fill('314.159.265-91')
    await page.getByLabel('CEP').fill('01000-000')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()

    const cpf = page.getByLabel('CPF')
    await expect(cpf).toHaveAttribute('aria-invalid', 'true')
    await expect(cpf).toHaveAccessibleDescription(/CPF inválido\. Confira os 11 dígitos\./)
    await expect(page).toHaveURL(/\/clientes\/novo$/)
    const found = await (await request.get('/api/customers?q=Cliente Teste E2E')).json()
    expect(found.customers).toHaveLength(0)
  })

  test('[BUG-03] RF-27 · aba desatualizada não grava condições em pedido faturado', async ({
    page,
    context,
    request,
  }) => {
    const item = await createProduct(request, {
      name: 'Retalho Avulso',
      unit: 'unit',
      priceCents: 30_000,
    })
    const order = await createDraft(request, [[item.id, 1]])
    await page.goto(`/pedidos/${order.id}`)

    // Outra aba finaliza e fatura o pedido inteiro.
    const other = await context.newPage()
    await other.goto(`/pedidos/${order.id}`)
    await other.getByRole('button', { name: 'Finalizar pedido' }).click()
    await other.getByRole('button', { name: 'Emitir nota' }).click()
    await expect(other.getByText(/Nota NI \d+ emitida/)).toBeVisible()
    await other.close()

    // A primeira aba ainda mostra o rascunho e tenta salvar um desconto.
    await page.getByLabel('Desconto global (%)').fill('50')
    await saveConditionsButton(page).click()
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'O pedido está faturado e não aceita alterações. Só pedidos em rascunho podem ser alterados.',
    )
    const after = await getOrder(request, order.id)
    expect(after).toMatchObject({ status: 'invoiced', discountPct: 0, totalCents: 30_000 })
  })
})

test('RF-34 · nota emitida aparece na lista com a situação', async ({ page, request }) => {
  const item = await createProduct(request, {
    name: 'Amostra de Tecido',
    unit: 'unit',
    priceCents: 5000,
  })
  const order = await createDraft(request, [[item.id, 1]])
  await finalize(request, order.id)
  const invoice = await issueInvoice(request, order.id, 5000)
  await page.goto('/faturamento')
  const row = page
    .getByRole('region', { name: 'Notas' })
    .getByRole('row')
    .filter({ hasText: `NI ${String(invoice.number).padStart(4, '0')}` })
  await expect(row).toContainText('Emitida')
  await expect(row.getByRole('button', { name: /^Cancelar nota NI/ })).toBeVisible()
})
