import { expect, test } from '@playwright/test'
import { createDraft, productByCode, restoreBugs, totals, valueOf } from './apoio'

// Projeto "celular": 360 × 780 px, com toque e agente de usuário de celular.
test.describe('no celular', { tag: '@celular' }, () => {
  test.beforeEach(async ({ request }) => {
    await restoreBugs(request)
  })

  test('RNF-06 · em 360 px nenhuma tela tem rolagem horizontal', async ({ page, request }) => {
    const roll = await productByCode(request, 'ROL2001')
    const order = await createDraft(request, [[roll.id, 2]], { installments: 3 })
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
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `rolagem horizontal em ${path}`).toBe(0)
    }
  })

  test('RNF-06 · pedido no celular: adicionar item e ver os totais logo depois das condições', async ({
    page,
  }) => {
    await page.goto('/pedidos/novo')
    await page.getByLabel('Cliente').selectOption({ label: 'Ana Almeida' })
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page).toHaveURL(/\/pedidos\/\d+$/)

    await page
      .getByLabel('Produto')
      .selectOption({ label: 'AVI3001 · Botão de Madeira 15 mm · R$ 0,85/un' })
    await page.getByLabel('Quantidade', { exact: true }).fill('12')
    await page.getByRole('button', { name: 'Adicionar item' }).click()
    await expect(valueOf(totals(page), 'Total')).toHaveText('R$ 10,20')

    // Ordem no celular: condições, depois totais, depois histórico.
    const conditions = await page.getByRole('heading', { name: 'Condições' }).boundingBox()
    const summary = await totals(page).boundingBox()
    const history = await page.getByRole('heading', { name: 'Histórico' }).boundingBox()
    expect(conditions!.y).toBeLessThan(summary!.y)
    expect(summary!.y).toBeLessThan(history!.y)
    expect(summary!.width).toBeLessThanOrEqual(360)
  })
})
