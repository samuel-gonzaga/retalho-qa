/**
 * Gera qa/06-relatorio-de-execucao.md a partir de uma execução real (`npm run qa:relatorio`):
 * suítes unitária e de API com cobertura, matriz de defeitos, E2E (quando houver relatório do
 * Playwright em test-results/e2e.json) e a cobertura de requisitos da matriz de rastreabilidade.
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { platform, release } from 'node:os'
import { join } from 'node:path'
import * as prettier from 'prettier'

const OUTPUT = 'qa/06-relatorio-de-execucao.md'
const VITEST_REPORT = join('test-results', 'vitest-execucao.json')
const COVERAGE = join('test-results', 'cobertura', 'coverage-summary.json')
const MATRIX = join('test-results', 'bug-matrix.json')
const E2E_REPORT = join('test-results', 'e2e.json')
const E2E_MATRIX = join('test-results', 'e2e-bug-matrix.json')
const TRACEABILITY = 'qa/04-matriz-de-rastreabilidade.md'

type Assertion = { fullName: string; status: string; duration?: number }
type VitestReport = {
  numTotalTests: number
  numPassedTests: number
  numFailedTests: number
  startTime: number
  testResults: { name: string; assertionResults: Assertion[]; startTime: number; endTime: number }[]
}
type Metric = { total: number; covered: number; pct: number }
type CoverageEntry = { lines: Metric; statements: Metric; branches: Metric; functions: Metric }
type MatrixRow = {
  bug: number
  tagged: number
  failedTagged: string[]
  maskedTagged: string[]
  unexpected: string[]
  ok: boolean
}

function run(command: string, args: string[]): void {
  const result = spawnSync(process.execPath, args, {
    env: { ...process.env, RETALHO_BUGS: '' },
    encoding: 'utf8',
  })
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`${command} terminou com código ${result.status}: ${result.stderr}`)
  }
}

const read = <T>(path: string) => JSON.parse(readFileSync(path, 'utf8')) as T
const fileOf = (name: string) => name.replace(/\\/g, '/').replace(/^.*?(tests\/)/, '$1')
const pct = (metric: Metric) => `${metric.pct.toFixed(1).replace('.', ',')} %`

function coverageByFolder(summary: Record<string, CoverageEntry>) {
  const folders = ['src/domain', 'src/server', 'src/db', 'src/app/api']
  return folders.map((folder) => {
    const entries = Object.entries(summary).filter(([file]) =>
      file.replace(/\\/g, '/').includes(`/${folder}/`),
    )
    const sum = (key: keyof CoverageEntry): Metric => {
      const total = entries.reduce((acc, [, entry]) => acc + entry[key].total, 0)
      const covered = entries.reduce((acc, [, entry]) => acc + entry[key].covered, 0)
      return { total, covered, pct: total === 0 ? 100 : (covered / total) * 100 }
    }
    return {
      folder,
      files: entries.length,
      lines: sum('lines'),
      statements: sum('statements'),
      branches: sum('branches'),
      functions: sum('functions'),
    }
  })
}

function e2eSummary(): { total: number; passed: number; failed: number } | null {
  if (!existsSync(E2E_REPORT)) return null
  const report = read<{ stats: { expected: number; unexpected: number; flaky: number } }>(
    E2E_REPORT,
  )
  const passed = report.stats.expected + report.stats.flaky
  return { total: passed + report.stats.unexpected, passed, failed: report.stats.unexpected }
}

/** Seção da matriz de defeitos dos E2E, lida de `npm run test:e2e:defeitos`, se já tiver rodado. */
function e2eMatrixSection(): string[] {
  if (!existsSync(E2E_MATRIX)) {
    return ['### 2.2 Matriz de defeitos dos E2E', '', 'Não executada nesta versão.', '']
  }
  const { rows } = read<{ rows: MatrixRow[] }>(E2E_MATRIX)
  return [
    '### 2.2 Matriz de defeitos dos E2E',
    '',
    'A suíte E2E inteira roda uma vez com cada defeito ligado (`npm run test:e2e:defeitos`).',
    '',
    '| Defeito | Testes etiquetados | Falharam (detecção) | Falhas sem etiqueta | Resultado |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| BUG-0${r.bug} | ${r.tagged} | ${r.failedTagged.length} | ${r.unexpected.length} | ${r.ok ? 'detectado' : 'NÃO detectado'} |`,
    ),
    '',
  ]
}

function traceabilityLine(label: string): string {
  const line = readFileSync(TRACEABILITY, 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`| ${label}`))
  return line?.split('|')[2]?.trim() ?? '—'
}

async function main() {
  const vitest = join('node_modules', 'vitest', 'vitest.mjs')
  run('vitest', [
    vitest,
    'run',
    '--project',
    'unit',
    '--project',
    'api',
    '--coverage',
    '--reporter=json',
    `--outputFile=${VITEST_REPORT}`,
  ])
  run('matriz de defeitos', [
    join('node_modules', 'tsx', 'dist', 'cli.mjs'),
    'scripts/bug-matrix.ts',
  ])

  const report = read<VitestReport>(VITEST_REPORT)
  const coverage = read<Record<string, CoverageEntry>>(COVERAGE)
  const matrix = read<{
    total: number
    baselineFailures: string[]
    rows: MatrixRow[]
    ok: boolean
  }>(MATRIX)
  const e2e = e2eSummary()

  const suites = ['unit', 'api'].map((project) => {
    const files = report.testResults.filter((file) =>
      fileOf(file.name).startsWith(`tests/${project}/`),
    )
    const tests = files.flatMap((file) => file.assertionResults)
    const duration = files.reduce((acc, file) => acc + (file.endTime - file.startTime), 0)
    return {
      project,
      files,
      total: tests.length,
      passed: tests.filter((t) => t.status === 'passed').length,
      failed: tests.filter((t) => t.status === 'failed').length,
      seconds: (duration / 1000).toFixed(1).replace('.', ','),
    }
  })
  const label = { unit: 'Unitária', api: 'API' } as const
  const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())
  const folders = coverageByFolder(coverage)
  const total = coverage.total as CoverageEntry
  const allPassed = suites.every((s) => s.failed === 0) && (e2e?.failed ?? 0) === 0
  const reqCases = traceabilityLine('Requisitos com caso de teste')
  const reqTests = traceabilityLine('Requisitos com teste automatizado que cita o ID')

  const lines = [
    '# Relatório de execução',
    '',
    `Gerado por \`npm run qa:relatorio\` em ${generatedAt} (horário de Brasília), sobre o commit`,
    `\`${commit}\`, com Node.js ${process.version} em ${platform()} ${release()}. Todos os`,
    'números abaixo vêm desta execução. Não edite à mão.',
    '',
    '## 1. Resumo',
    '',
    '| Suíte | Arquivos | Testes | Passaram | Falharam | Duração |',
    '| --- | --- | --- | --- | --- | --- |',
    ...suites.map(
      (s) =>
        `| ${label[s.project as 'unit' | 'api']} | ${s.files.length} | ${s.total} | ${s.passed} | ${s.failed} | ${s.seconds} s |`,
    ),
    e2e
      ? `| E2E (Playwright) | — | ${e2e.total} | ${e2e.passed} | ${e2e.failed} | — |`
      : '| E2E (Playwright) | — | não executada nesta versão | — | — | — |',
    '',
    `Com todos os defeitos desligados, ${allPassed ? 'todos os testes passaram' : 'houve falhas (ver seção 5)'}.`,
    '',
    '## 2. Matriz de defeitos',
    '',
    `Sem defeitos ligados: ${matrix.total - matrix.baselineFailures.length} de ${matrix.total} testes passaram.`,
    'Com cada defeito ligado (`RETALHO_BUGS=n`), as falhas abaixo são as **esperadas**: só testes',
    'etiquetados com o defeito podem falhar.',
    '',
    '| Defeito | Testes etiquetados | Falharam (detecção) | Passaram (mascarados) | Falhas sem etiqueta | Resultado |',
    '| --- | --- | --- | --- | --- | --- |',
    ...matrix.rows.map(
      (r) =>
        `| BUG-0${r.bug} | ${r.tagged} | ${r.failedTagged.length} | ${r.maskedTagged.length} | ${r.unexpected.length} | ${r.ok ? 'detectado' : 'NÃO detectado'} |`,
    ),
    '',
    '### 2.1 Falhas esperadas por defeito',
    '',
    ...matrix.rows.flatMap((r) => [
      `**BUG-0${r.bug}**`,
      '',
      ...r.failedTagged.map((name) => `- falhou: ${name}`),
      ...r.maskedTagged.map((name) => `- passou com o defeito ligado (mascarado): ${name}`),
      ...r.unexpected.map((name) => `- FALHA SEM ETIQUETA: ${name}`),
      '',
    ]),
    ...e2eMatrixSection(),
    '## 3. Cobertura de código',
    '',
    'Medida pelo provedor V8 do Vitest nas suítes unitária e de API. As telas (`src/app`, exceto',
    'as rotas de API) e os componentes são cobertos pelos testes E2E, que não entram nesta conta.',
    '',
    '| Pasta | Arquivos | Linhas | Comandos | Ramos | Funções |',
    '| --- | --- | --- | --- | --- | --- |',
    ...folders.map(
      (f) =>
        `| \`${f.folder}\` | ${f.files} | ${pct(f.lines)} | ${pct(f.statements)} | ${pct(f.branches)} | ${pct(f.functions)} |`,
    ),
    `| **Total** | ${Object.keys(coverage).length - 1} | ${pct(total.lines)} | ${pct(total.statements)} | ${pct(total.branches)} | ${pct(total.functions)} |`,
    '',
    '## 4. Cobertura de requisitos',
    '',
    'Da matriz de rastreabilidade (`qa/04-matriz-de-rastreabilidade.md`):',
    '',
    '| Medida | Valor |',
    '| --- | --- |',
    `| Requisitos com caso de teste | ${reqCases} |`,
    `| Requisitos com teste automatizado que cita o ID | ${reqTests} |`,
    '',
    '## 5. Testes por arquivo',
    '',
    '| Arquivo | Testes | Falharam |',
    '| --- | --- | --- |',
    ...report.testResults
      .map((file) => ({
        file: fileOf(file.name),
        total: file.assertionResults.length,
        failed: file.assertionResults.filter((t) => t.status === 'failed').length,
      }))
      .sort((a, b) => a.file.localeCompare(b.file))
      .map((f) => `| \`${f.file}\` | ${f.total} | ${f.failed} |`),
    '',
    '## 6. Critérios de saída do plano de teste',
    '',
    '| Critério | Situação |',
    '| --- | --- |',
    `| Testes unitários e de API passam com os defeitos desligados | ${suites.every((s) => s.failed === 0) ? 'atendido' : 'não atendido'} |`,
    `| Testes E2E passam com os defeitos desligados | ${e2e ? (e2e.failed === 0 ? 'atendido' : 'não atendido') : 'pendente: E2E ainda não executados'} |`,
    `| Os 7 defeitos detectados, sem falha fora das etiquetas | ${matrix.ok ? 'atendido' : 'não atendido'} |`,
    `| 100 % dos requisitos com caso de teste | ${reqCases.includes('100 %') ? 'atendido' : 'não atendido'} |`,
    '',
  ]

  const options = (await prettier.resolveConfig(OUTPUT)) ?? {}
  writeFileSync(
    OUTPUT,
    await prettier.format(lines.join('\n'), { ...options, plugins: [], parser: 'markdown' }),
  )
  console.log(
    `Relatório gerado: ${suites.map((s) => `${label[s.project as 'unit' | 'api']} ${s.passed}/${s.total}`).join(', ')}; ` +
      `matriz ${matrix.ok ? 'ok' : 'com problemas'}; cobertura de linhas ${pct(total.lines)}.`,
  )
}

void main()
