/**
 * Capturas de tela de cada tela em desktop (1280 px) e celular (360 px), para a revisão visual
 * da Fase 3. Também confere a rolagem horizontal em 360 px (RNF-06).
 *
 * Uso: com o servidor rodando, `npx tsx scripts/screenshots.ts [url-base] [pasta]`.
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3200'
const OUT = process.argv[3] ?? join('test-results', 'capturas')
const ONLY = process.env.CAPTURAS?.split(',')

const PAGES: [string, string][] = [
  ['painel', '/'],
  ['pedidos', '/pedidos'],
  ['pedido-novo', '/pedidos/novo'],
  ['pedido-rascunho', '/pedidos/12'],
  ['pedido-parcial', '/pedidos/3'],
  ['faturamento', '/faturamento'],
  ['produtos', '/produtos'],
  ['produto-rolo', '/produtos/11'],
  ['clientes', '/clientes'],
  ['cliente-novo', '/clientes/novo'],
]

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 360, height: 780 },
]

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const problems: string[] = []
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: 'pt-BR',
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    for (const [name, path] of PAGES) {
      if (ONLY && !ONLY.includes(name)) continue
      await page.goto(BASE + path, { waitUntil: 'networkidle' })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      if (overflow > 0)
        problems.push(`${name} (${viewport.name}): ${overflow}px de rolagem horizontal`)
      await page.screenshot({ path: join(OUT, `${name}-${viewport.name}.png`), fullPage: true })
    }
    await context.close()
  }
  await browser.close()
  console.log(problems.length ? problems.join('\n') : 'Sem rolagem horizontal em nenhuma tela.')
}

void main()
