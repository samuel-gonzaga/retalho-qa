import { expect, test } from '@playwright/test'
import { createProduct, restoreBugs, totals, valueOf } from './apoio'

test.beforeEach(async ({ request }) => {
  await restoreBugs(request)
})

test.describe('RF-13 a RF-35 · fluxo feliz do pedido', () => {
  test('pedido com 3 unidades, 10 % de desconto e 3 parcelas, faturado em 2 notas', async ({
    page,
    request,
  }) => {
    const kit = await createProduct(request, {
      name: 'Kit de Costura E2E',
      unit: 'unit',
      priceCents: 15_000,
    })

    // Novo pedido para uma cliente com CEP de entrega própria.
    await page.goto('/pedidos/novo')
    await page.getByLabel('Cliente').selectOption({ label: 'Ana Almeida' })
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page).toHaveURL(/\/pedidos\/\d+$/)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toHaveText(/^Pedido nº \d+$/)
    const orderNumber = (await heading.innerText()).replace(/\D/g, '')

    // 3 unidades a R$ 150,00.
    await page
      .getByLabel('Produto')
      .selectOption({ label: `${kit.code} · Kit de Costura E2E · R$ 150,00/un` })
    await page.getByLabel('Quantidade', { exact: true }).fill('3')
    await page.getByRole('button', { name: 'Adicionar item' }).click()
    await expect(valueOf(totals(page), 'Subtotal')).toHaveText('R$ 450,00')

    // 10 % de desconto, Pix e 3 parcelas.
    await page.getByLabel('Desconto global (%)').fill('10')
    await page.getByLabel('Pix').check()
    await page.getByLabel('Parcelas').selectOption('3')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Condições salvas. Os totais foram recalculados.')).toBeVisible()
    await expect(valueOf(totals(page), 'Desconto (10 %)')).toHaveText(/R\$ 45,00/)
    await expect(valueOf(totals(page), 'Frete')).toHaveText('Grátis')
    await expect(valueOf(totals(page), 'Total')).toHaveText('R$ 405,00')
    await expect(totals(page).getByRole('listitem')).toHaveText([
      /1ª parcela\s*R\$ 135,00/,
      /2ª parcela\s*R\$ 135,00/,
      /3ª parcela\s*R\$ 135,00/,
    ])

    // Finalizar congela itens e condições.
    await page.getByRole('button', { name: 'Finalizar pedido' }).click()
    await expect(page.getByText('itens e condições estão congelados')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toHaveCount(0)

    // Primeira nota, parcial: R$ 200,00.
    const billing = page.getByRole('region', { name: 'Faturamento' })
    const amount = page.getByLabel(/Valor da nota/)
    await expect(amount).toHaveValue('405,00')
    await amount.fill('200,00')
    await page.getByRole('button', { name: 'Emitir nota' }).click()
    await expect(
      page.getByText(/Nota NI \d+ emitida para o pedido nº \d+: R\$ 200,00\./),
    ).toBeVisible()
    await expect(valueOf(billing, 'Saldo a faturar')).toHaveText('R$ 205,00')
    await expect(
      page.getByRole('main').getByText('Parcialmente faturado', { exact: true }).first(),
    ).toBeVisible()

    // Segunda nota, com o saldo sugerido: o pedido fica faturado.
    await expect(amount).toHaveValue('205,00')
    await page.getByRole('button', { name: 'Emitir nota' }).click()
    await expect(
      page.getByText(/Nota NI \d+ emitida para o pedido nº \d+: R\$ 205,00\./),
    ).toBeVisible()
    await expect(valueOf(billing, 'Saldo a faturar')).toHaveText('R$ 0,00')
    await expect(page.getByRole('button', { name: 'Emitir nota' })).toHaveCount(0)
    const history = page.getByRole('region', { name: 'Histórico' }).getByRole('listitem')
    await expect(history).toHaveCount(3)
    await expect(history.last()).toContainText('Parcialmente faturado → Faturado')

    // A lista de notas mostra as duas notas do pedido.
    await page.goto('/faturamento')
    const notes = page
      .getByRole('region', { name: 'Notas' })
      .getByRole('row')
      .filter({ hasText: `nº ${orderNumber}` })
    await expect(notes).toHaveCount(2)
    await expect(notes.filter({ hasText: 'R$ 200,00' })).toContainText('Emitida')
    await expect(notes.filter({ hasText: 'R$ 205,00' })).toContainText('Emitida')
  })
})
