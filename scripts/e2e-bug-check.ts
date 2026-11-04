/**
 * Matriz de defeitos dos testes E2E (`npm run test:e2e:defeitos [n ...]`).
 *
 * Para cada defeito, sobe o build de produção com RETALHO_BUGS=n, roda a suíte E2E inteira e
 * confere que algum teste etiquetado [BUG-0n] falha e que nenhum teste sem essa etiqueta falha.
 * Exige um build prévio (`npm run build`). Grava test-results/e2e-bug-matrix.{json,md}.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type Spec = { title: string; ok: boolean }
type Suite = { title: string; specs?: Spec[]; suites?: Suite[] }
type Row = {
  bug: number
  tagged: number
  failedTagged: string[]
  masked: string[]
  unexpected: string[]
  ok: boolean
}

const requested = process.argv
  .slice(2)
  .map(Number)
  .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
const bugs = requested.length > 0 ? requested : [1, 2, 3, 4, 5, 6, 7]

if (!existsSync(join('.next', 'BUILD_ID'))) {
  console.error('Build de produção não encontrado: rode `npm run build` antes.')
  process.exit(1)
}

function specsOf(suite: Suite, path: string[] = []): { name: string; ok: boolean }[] {
  const here = suite.title ? [...path, suite.title] : path
  return [
    ...(suite.specs ?? []).map((spec) => ({
      name: [...here, spec.title].join(' › '),
      ok: spec.ok,
    })),
    ...(suite.suites ?? []).flatMap((child) => specsOf(child, here)),
  ]
}

const rows: Row[] = bugs.map((bug) => {
  const output = join('test-results', `e2e-defeito-${bug}.json`)
  spawnSync(
    process.execPath,
    [join('node_modules', '@playwright', 'test', 'cli.js'), 'test', '--retries=0'],
    {
      env: {
        ...process.env,
        CI: '1',
        E2E_SKIP_BUILD: '1',
        RETALHO_BUGS: String(bug),
        E2E_JSON: output,
        E2E_HTML: join('test-results', `playwright-report-defeito-${bug}`),
      },
      encoding: 'utf8',
    },
  )
  const report = JSON.parse(readFileSync(output, 'utf8')) as { suites: Suite[] }
  const specs = report.suites.flatMap((suite) => specsOf(suite))
  const tag = `[BUG-0${bug}]`
  const tagged = specs.filter((spec) => spec.name.includes(tag))
  const failedTagged = tagged.filter((spec) => !spec.ok).map((spec) => spec.name)
  const masked = tagged.filter((spec) => spec.ok).map((spec) => spec.name)
  const unexpected = specs
    .filter((spec) => !spec.ok && !spec.name.includes(tag))
    .map((spec) => spec.name)
  const row = {
    bug,
    tagged: tagged.length,
    failedTagged,
    masked,
    unexpected,
    ok: failedTagged.length > 0 && unexpected.length === 0,
  }
  console.log(
    `BUG-0${bug}: ${failedTagged.length} de ${tagged.length} etiquetado(s) falharam; ` +
      `${unexpected.length} falha(s) sem etiqueta → ${row.ok ? 'detectado' : 'FALHOU'}`,
  )
  for (const name of unexpected) console.log(`  falha sem etiqueta: ${name}`)
  return row
})

const lines = [
  '# Matriz de defeitos dos E2E',
  '',
  '| Defeito | Testes etiquetados | Falharam (detecção) | Falhas sem etiqueta | Resultado |',
  '| ------- | ------------------ | ------------------- | ------------------- | --------- |',
  ...rows.map(
    (r) =>
      `| BUG-0${r.bug} | ${r.tagged} | ${r.failedTagged.length} | ${r.unexpected.length} | ${r.ok ? 'detectado' : 'FALHOU'} |`,
  ),
  '',
]
writeFileSync(join('test-results', 'e2e-bug-matrix.md'), lines.join('\n'))
writeFileSync(
  join('test-results', 'e2e-bug-matrix.json'),
  JSON.stringify({ rows, ok: rows.every((r) => r.ok) }, null, 2),
)
process.exit(rows.every((r) => r.ok) ? 0 : 1)
