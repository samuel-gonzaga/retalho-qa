/**
 * Gera qa/04-matriz-de-rastreabilidade.md (`npm run qa:rastreabilidade`).
 *
 * Fontes, todas lidas a cada execução:
 * - requisitos: títulos `### RF-nn · ...` e `### RNF-nn · ...` de docs/SPEC.md;
 * - casos de teste: linhas `| CT-nn | requisitos | técnica | ... | automação |` de qa/02;
 * - testes automatizados: relatório JSON de uma execução real das suítes unitária e de API (e do
 *   Playwright, quando existir test-results/e2e.json);
 * - defeitos: tabela "Viola" da seção 12 da especificação.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as prettier from 'prettier'

const SPEC = 'docs/SPEC.md'
const CASES = 'qa/02-casos-de-teste.md'
const OUTPUT = 'qa/04-matriz-de-rastreabilidade.md'
const VITEST_REPORT = join('test-results', 'vitest-rastreabilidade.json')
const E2E_REPORT = join('test-results', 'e2e.json')
const ID = /\b(?:RNF|RF)-\d{2}\b/g

type Requirement = { id: string; title: string }
type TestCase = { id: string; requirements: string[]; technique: string; automation: string }
type AutomatedTest = { file: string; name: string; status: string }

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function requirements(): Requirement[] {
  return [...read(SPEC).matchAll(/^### ((?:RF|RNF)-\d{2}) · (.+)$/gm)].map((m) => ({
    id: m[1] as string,
    title: (m[2] as string).trim(),
  }))
}

function testCases(): TestCase[] {
  return read(CASES)
    .split('\n')
    .filter((line) => /^\| CT-\d{2,3} \|/.test(line))
    .map((line) => {
      const cells = line.split('|').map((cell) => cell.trim())
      return {
        id: cells[1] as string,
        requirements: (cells[2] ?? '').match(ID) ?? [],
        technique: cells[3] ?? '',
        automation: cells[7] ?? '',
      }
    })
}

/** Defeito → requisitos violados, lidos da tabela-resumo da seção 12 da especificação. */
function defects(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const line of read(SPEC).split('\n')) {
    const match = /^\|\s*(BUG-0\d)\s*\|[^|]*\|([^|]*)\|/.exec(line)
    if (match) map.set(match[1] as string, (match[2] ?? '').match(ID) ?? [])
  }
  return map
}

function vitestTests(): AutomatedTest[] {
  mkdirSync('test-results', { recursive: true })
  spawnSync(
    process.execPath,
    [
      join('node_modules', 'vitest', 'vitest.mjs'),
      'run',
      '--project',
      'unit',
      '--project',
      'api',
      '--reporter=json',
      `--outputFile=${VITEST_REPORT}`,
    ],
    { env: { ...process.env, RETALHO_BUGS: '' }, encoding: 'utf8' },
  )
  const report = JSON.parse(read(VITEST_REPORT)) as {
    testResults: { name: string; assertionResults: { fullName: string; status: string }[] }[]
  }
  return report.testResults.flatMap((file) =>
    file.assertionResults.map((test) => ({
      file: file.name.replace(/\\/g, '/').replace(/^.*?(tests\/)/, '$1'),
      name: test.fullName,
      status: test.status,
    })),
  )
}

/** Testes do Playwright, se a Fase 5 já tiver gerado o relatório JSON. */
function e2eTests(): AutomatedTest[] {
  if (!existsSync(E2E_REPORT)) return []
  type Suite = { title: string; file?: string; specs?: Spec[]; suites?: Suite[] }
  type Spec = { title: string; file: string; ok: boolean }
  const report = JSON.parse(read(E2E_REPORT)) as { suites: Suite[] }
  const tests: AutomatedTest[] = []
  const walk = (suite: Suite, path: string[]) => {
    for (const spec of suite.specs ?? []) {
      tests.push({
        file: `tests/e2e/${spec.file}`,
        name: [...path, spec.title].join(' › '),
        status: spec.ok ? 'passed' : 'failed',
      })
    }
    for (const child of suite.suites ?? []) walk(child, [...path, child.title])
  }
  for (const suite of report.suites) walk(suite, [])
  return tests
}

/** IDs citados num título, expandindo intervalos como "RF-25 a RF-29". */
function citedIds(text: string): Set<string> {
  const ids = new Set(text.match(ID) ?? [])
  for (const range of text.matchAll(/\b(RNF|RF)-(\d{2}) a \1-(\d{2})\b/g)) {
    for (let n = Number(range[2]); n <= Number(range[3]); n++) {
      ids.add(`${range[1]}-${String(n).padStart(2, '0')}`)
    }
  }
  return ids
}

function joinOrDash(items: string[]): string {
  return items.length > 0 ? items.join(', ') : '—'
}

async function main() {
  const reqs = requirements()
  const cases = testCases()
  const bugToReqs = defects()
  const tests = [...vitestTests(), ...e2eTests()]

  const casesOf = (id: string) => cases.filter((c) => c.requirements.includes(id))
  const testsOf = (id: string) => tests.filter((t) => citedIds(t.name).has(id))
  const bugsOf = (id: string) =>
    [...bugToReqs].filter(([, violated]) => violated.includes(id)).map(([bug]) => bug)

  const rows = reqs.map((req) => {
    const reqCases = casesOf(req.id)
    const reqTests = testsOf(req.id)
    const byFile = new Map<string, number>()
    for (const test of reqTests) byFile.set(test.file, (byFile.get(test.file) ?? 0) + 1)
    const automated =
      reqTests.length > 0
        ? [...byFile]
            .map(([file, count]) => `\`${file.replace('tests/', '')}\` (${count})`)
            .join(', ')
        : joinOrDash(
            [
              ...new Set(reqCases.map((c) => c.automation).filter((a) => !a.includes('tests/'))),
            ].map((a) => `${a} ¹`),
          )
    return { req, reqCases, reqTests, automated, bugs: bugsOf(req.id) }
  })

  const withCases = rows.filter((row) => row.reqCases.length > 0).length
  const withTests = rows.filter((row) => row.reqTests.length > 0).length
  const percent = (n: number) => `${Math.round((n / reqs.length) * 100)} %`
  const failing = tests.filter((t) => t.status === 'failed')

  const lines = [
    '# Matriz de rastreabilidade',
    '',
    'Gerada por `npm run qa:rastreabilidade` a partir da especificação, dos casos de teste e de',
    'uma execução real das suítes automatizadas, com todos os defeitos desligados. Não edite à mão.',
    '',
    '## 1. Cobertura',
    '',
    '| Medida | Valor |',
    '| --- | --- |',
    `| Requisitos | ${reqs.length} |`,
    `| Requisitos com caso de teste | ${withCases} (${percent(withCases)}) |`,
    `| Requisitos com teste automatizado que cita o ID | ${withTests} (${percent(withTests)}) |`,
    `| Casos de teste | ${cases.length} |`,
    `| Testes automatizados lidos | ${tests.length} (${failing.length} com falha) |`,
    '',
    '## 2. Requisito → caso → teste → defeito',
    '',
    '| Requisito | Descrição | Casos de teste | Testes automatizados (arquivo e quantidade) | Defeitos |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| ${row.req.id} | ${row.req.title} | ${joinOrDash(row.reqCases.map((c) => c.id))} | ` +
        `${row.automated} | ${joinOrDash(row.bugs)} |`,
    ),
    '',
    '¹ Ainda sem teste automatizado que cite o requisito; o caso é verificado como indicado.',
    '',
    '## 3. Defeito → requisito → caso → teste',
    '',
    '| Defeito | Requisitos violados | Casos que o detectam | Testes etiquetados |',
    '| --- | --- | --- | --- |',
    ...[...bugToReqs].map(([bug, violated]) => {
      const tag = `[${bug}]`
      const detecting = read(CASES)
        .split('\n')
        .filter((line) => /^\| CT-\d{2,3} \|/.test(line) && line.includes(tag))
        .map((line) => line.split('|')[1]?.trim() ?? '')
      const tagged = tests.filter((t) => t.name.includes(tag))
      const files = [...new Set(tagged.map((t) => `\`${t.file.replace('tests/', '')}\``))]
      return `| ${bug} | ${violated.join(', ')} | ${joinOrDash(detecting)} | ${tagged.length} em ${files.join(', ')} |`
    }),
    '',
  ]

  const options = (await prettier.resolveConfig(OUTPUT)) ?? {}
  const formatted = await prettier.format(lines.join('\n'), {
    ...options,
    plugins: [],
    parser: 'markdown',
  })
  writeFileSync(OUTPUT, formatted)
  console.log(
    `Matriz gerada: ${reqs.length} requisitos, ${withCases} com caso, ${withTests} com teste automatizado, ${tests.length} testes lidos.`,
  )
  if (withCases < reqs.length) process.exit(1)
}

void main()
