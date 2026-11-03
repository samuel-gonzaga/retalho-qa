/**
 * Matriz de defeitos (`npm run test:defeitos`).
 *
 * Roda as suítes unitária e de API uma vez com todos os defeitos desligados e uma vez com cada
 * defeito ligado (RETALHO_BUGS=n), e confere que:
 * - sem defeitos, nenhum teste falha;
 * - com o defeito n, ao menos um teste etiquetado [BUG-0n] falha (o defeito é detectado);
 * - com o defeito n, nenhum teste sem essa etiqueta falha (a detecção é rastreável).
 * Testes etiquetados que passam com o defeito ligado aparecem como "mascarados".
 *
 * O resultado fica em test-results/bug-matrix.json e test-results/bug-matrix.md.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = 'test-results'
const VITEST = join('node_modules', 'vitest', 'vitest.mjs')
const BUGS = [1, 2, 3, 4, 5, 6, 7]

type Assertion = { fullName: string; status: string }
type Report = {
  numTotalTests: number
  numFailedTests: number
  testResults: { assertionResults: Assertion[] }[]
}

type Row = {
  bug: number
  tagged: number
  failedTagged: string[]
  maskedTagged: string[]
  unexpected: string[]
  ok: boolean
}

function runSuites(bugs: string): Assertion[] {
  const outputFile = join(OUT_DIR, `vitest-defeito-${bugs || 'nenhum'}.json`)
  const result = spawnSync(
    process.execPath,
    [
      VITEST,
      'run',
      '--project',
      'unit',
      '--project',
      'api',
      '--reporter=json',
      `--outputFile=${outputFile}`,
    ],
    { env: { ...process.env, RETALHO_BUGS: bugs }, encoding: 'utf8' },
  )
  let report: Report
  try {
    report = JSON.parse(readFileSync(outputFile, 'utf8')) as Report
  } catch {
    console.error(result.stdout, result.stderr)
    throw new Error(`O Vitest não gerou relatório com RETALHO_BUGS=${bugs}`)
  }
  return report.testResults.flatMap((file) => file.assertionResults)
}

const tagOf = (bug: number) => `[BUG-0${bug}]`

mkdirSync(OUT_DIR, { recursive: true })

const baseline = runSuites('')
const baselineFailures = baseline.filter((a) => a.status === 'failed').map((a) => a.fullName)

const rows: Row[] = BUGS.map((bug) => {
  const assertions = runSuites(String(bug))
  const tagged = assertions.filter((a) => a.fullName.includes(tagOf(bug)))
  const failedTagged = tagged.filter((a) => a.status === 'failed').map((a) => a.fullName)
  const maskedTagged = tagged.filter((a) => a.status === 'passed').map((a) => a.fullName)
  const unexpected = assertions
    .filter((a) => a.status === 'failed' && !a.fullName.includes(tagOf(bug)))
    .map((a) => a.fullName)
  return {
    bug,
    tagged: tagged.length,
    failedTagged,
    maskedTagged,
    unexpected,
    ok: failedTagged.length > 0 && unexpected.length === 0,
  }
})

const ok = baselineFailures.length === 0 && rows.every((row) => row.ok)

const lines = [
  '# Matriz de defeitos',
  '',
  `Execução de ${new Date().toISOString()}. Suítes: unitária e de API (${baseline.length} testes).`,
  '',
  `Sem defeitos ligados: ${baseline.length - baselineFailures.length} de ${baseline.length} testes passaram.`,
  '',
  '| Defeito | Testes etiquetados | Falharam (detecção) | Passaram (mascarados) | Falhas sem etiqueta | Resultado |',
  '| ------- | ------------------ | ------------------- | --------------------- | ------------------- | --------- |',
  ...rows.map(
    (row) =>
      `| BUG-0${row.bug} | ${row.tagged} | ${row.failedTagged.length} | ${row.maskedTagged.length} | ` +
      `${row.unexpected.length} | ${row.ok ? 'detectado' : 'FALHOU'} |`,
  ),
  '',
  ...rows.flatMap((row) => [
    `## BUG-0${row.bug}`,
    '',
    ...row.failedTagged.map((name) => `- falhou (esperado): ${name}`),
    ...row.maskedTagged.map((name) => `- passou com o defeito ligado (mascarado): ${name}`),
    ...row.unexpected.map((name) => `- FALHA SEM ETIQUETA: ${name}`),
    '',
  ]),
]

writeFileSync(join(OUT_DIR, 'bug-matrix.md'), lines.join('\n'))
writeFileSync(
  join(OUT_DIR, 'bug-matrix.json'),
  JSON.stringify({ total: baseline.length, baselineFailures, rows, ok }, null, 2),
)

console.log(lines.slice(0, 7 + rows.length + 2).join('\n'))
if (baselineFailures.length > 0) {
  console.error(`\nFalhas com todos os defeitos desligados:\n- ${baselineFailures.join('\n- ')}`)
}
for (const row of rows.filter((r) => !r.ok)) {
  console.error(
    `\nBUG-0${row.bug}: ${row.failedTagged.length === 0 ? 'nenhum teste etiquetado falhou' : ''}`,
  )
  for (const name of row.unexpected) console.error(`  falha sem etiqueta: ${name}`)
}
process.exit(ok ? 0 : 1)
