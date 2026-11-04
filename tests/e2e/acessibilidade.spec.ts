import { expect, test } from '@playwright/test'
import { createDraft, focusIsVisible, restoreBugs, tabTo, totals, valueOf } from './apoio'

test.beforeEach(async ({ request }) => {
  await restoreBugs(request)
})

test('RNF-05 · fluxo do pedido só com teclado, com foco sempre visível', async ({ page }) => {
  await page.goto('/pedidos/novo')

  // Cada passo chega ao controle com Tab, confere o foco visível e o aciona com o teclado.
  async function reach(name: string, target: ReturnType<typeof page.getByRole>) {
    await tabTo(page, target)
    expect(await focusIsVisible(page), `foco visível em ${name}`).toBe(true)
  }

  await reach('cliente', page.getByRole('combobox', { name: 'Cliente' }))
  await page.keyboard.type('Ana Almeida')
  await reach('salvar', page.getByRole('button', { name: 'Salvar', exact: true }))
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/pedidos\/\d+$/)

  await reach('produto', page.getByRole('combobox', { name: 'Produto' }))
  await page.keyboard.type('TEC1001')
  await reach('quantidade', page.getByRole('textbox', { name: 'Quantidade', exact: true }))
  await page.keyboard.type('2')
  await reach('adicionar item', page.getByRole('button', { name: 'Adicionar item' }))
  await page.keyboard.press('Enter')
  await expect(valueOf(totals(page), 'Subtotal')).toHaveText('R$ 99,80')

  await reach('finalizar', page.getByRole('button', { name: 'Finalizar pedido' }))
  await page.keyboard.press('Enter')
  await expect(page.getByText('itens e condições estão congelados')).toBeVisible()

  await reach('emitir nota', page.getByRole('button', { name: 'Emitir nota' }))
  await page.keyboard.press('Enter')
  await expect(
    page.getByText(/Nota NI \d+ emitida para o pedido nº \d+: R\$ 99,80\./),
  ).toBeVisible()
})

test('RNF-05 · o diálogo de cancelamento deixa a página por trás inerte e fecha com Esc', async ({
  page,
  request,
}) => {
  const order = await createDraft(request, [])
  await page.goto(`/pedidos/${order.id}`)
  const trigger = page.getByRole('button', { name: 'Cancelar pedido' })
  await tabTo(page, trigger)
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // O <dialog> nativo deixa a página inerte: o Tab passa pelo diálogo e pelos controles do
  // navegador, mas nunca por um elemento da página por trás.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    const outside = await dialog.evaluate((element) => {
      const active = document.activeElement
      return active !== null && active !== document.body && !element.contains(active)
    })
    expect(outside, 'foco num elemento da página por trás do diálogo').toBe(false)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('RNF-07 · com movimento reduzido, nenhuma transição dura mais que 0,01 s', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const path of ['/', '/pedidos', '/qa/defeitos']) {
    await page.goto(path)
    const longest = await page.evaluate(() => {
      const seconds = (value: string) =>
        Math.max(
          ...value
            .split(',')
            .map((part) => parseFloat(part) * (part.trim().endsWith('ms') ? 0.001 : 1)),
        )
      return Math.max(
        ...[...document.querySelectorAll('*')].map((element) => {
          const style = getComputedStyle(element)
          return Math.max(seconds(style.transitionDuration), seconds(style.animationDuration))
        }),
      )
    })
    expect(longest, `maior transição em ${path}`).toBeLessThanOrEqual(0.01)
  }
})

test.describe('RNF-08 · estados de vazio, erro e falha de rede', () => {
  test('busca sem resultado repete o termo e sugere o que fazer', async ({ page }) => {
    await page.goto('/produtos?q=veludo-que-nao-existe')
    await expect(
      page.getByText('Nenhum produto encontrado para “veludo-que-nao-existe”.'),
    ).toBeVisible()
    await expect(page.getByText('Confira a grafia ou cadastre um novo produto.')).toBeVisible()
  })

  test('pedido inexistente mostra a página de não encontrado com orientação', async ({ page }) => {
    await page.goto('/pedidos/999999')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
    await expect(page.getByText(/Confira o número informado\./)).toBeVisible()
  })

  test('falha de rede ao finalizar mostra o que fazer, sem código técnico', async ({
    page,
    request,
  }) => {
    const order = await createDraft(request, [])
    await page.route('**/api/orders/*/finalize', (route) => route.abort('internetdisconnected'))
    await page.goto(`/pedidos/${order.id}`)
    await page.getByRole('button', { name: 'Finalizar pedido' }).click()
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.',
    )
  })

  test('erro de validação aparece em linguagem de usuário, sem código técnico', async ({
    page,
    request,
  }) => {
    const order = await createDraft(request, [])
    await page.goto(`/pedidos/${order.id}`)
    await page.getByLabel('Produto').selectOption({ index: 1 })
    await page.getByLabel('Quantidade', { exact: true }).fill('0')
    await page.getByRole('button', { name: 'Adicionar item' }).click()
    await expect(page.getByText('Informe uma quantidade entre 0,01 e 1.000.')).toBeVisible()
    await expect(page.getByRole('main')).not.toContainText(/[A-Z]+_[A-Z]+/)
  })
})
