/**
 * Verifica a consistência dos IDs citados na documentação, no código e nos testes.
 *
 * - Requisitos (RF-nn, RNF-nn) são definidos em docs/SPEC.md por títulos `### RF-nn · ...`,
 *   com ID único e um critério de aceite (`**Aceite:**`), o que os torna testáveis.
 * - Defeitos são definidos em docs/SPEC.md por títulos `### BUG-0n · ...` (de 1 a 7).
 * - Toda citação de RF, RNF, BUG, CT, D ou P aponta para um ID que existe.
 * - Quando a matriz de rastreabilidade existir, ela cita todos os requisitos.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SPEC = 'docs/SPEC.md'
const DECISIONS = 'docs/DECISOES.md'
const PENDING = 'docs/PENDENCIAS.md'
const TEST_CASES = 'qa/02-casos-de-teste.md'
const MATRIX = 'qa/04-matriz-de-rastreabilidade.md'
const SCANNED_DIRS = ['docs', 'qa', 'src', 'tests']
const SCANNED_EXTENSIONS = ['.md', '.ts', '.tsx']
const BUG_COUNT = 7

const errors: string[] = []

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8')
}

function walk(dir: string): string[] {
  const absolute = join(ROOT, dir)
  if (!existsSync(absolute)) return []
  return readdirSync(absolute).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(join(ROOT, path)).isDirectory()) return walk(path)
    return SCANNED_EXTENSIONS.some((ext) => name.endsWith(ext)) ? [path] : []
  })
}

/** Coleta IDs definidos por `pattern` (grupo 1 = ID), apontando definições repetidas. */
function collect(file: string, pattern: RegExp, kind: string): Set<string> {
  const ids = new Set<string>()
  if (!existsSync(join(ROOT, file))) return ids
  read(file)
    .split('\n')
    .forEach((line, index) => {
      const id = pattern.exec(line)?.[1]
      if (!id) return
      if (ids.has(id)) errors.push(`${file}:${index + 1}: ${kind} ${id} definido mais de uma vez`)
      ids.add(id)
    })
  return ids
}

function checkSpecBlocks(): void {
  const lines = read(SPEC).split('\n')
  let current: { id: string; line: number; hasAcceptance: boolean } | null = null
  const close = () => {
    if (current && !current.hasAcceptance) {
      errors.push(`${SPEC}:${current.line}: ${current.id} não tem critério de aceite (**Aceite:**)`)
    }
  }
  lines.forEach((line, index) => {
    if (line.startsWith('#')) {
      close()
      const id = /^#{2,4} ((?:RF|RNF)-\d{2}) · /.exec(line)?.[1]
      current = id ? { id, line: index + 1, hasAcceptance: false } : null
    } else if (current && line.includes('**Aceite:**')) {
      current.hasAcceptance = true
    }
  })
  close()
}

if (!existsSync(join(ROOT, SPEC))) {
  console.error(`${SPEC} não encontrado.`)
  process.exit(1)
}

const requirements = collect(SPEC, /^#{2,4} ((?:RF|RNF)-\d{2}) · /, 'requisito')
const bugs = collect(SPEC, /^#{2,4} (BUG-\d{2}) · /, 'defeito')
const decisions = collect(DECISIONS, /^#{2,4} (D-\d{2}) · /, 'decisão')
const pending = collect(PENDING, /^\| (P-\d{2}) \|/, 'pendência')
const testCases = collect(TEST_CASES, /^\| (CT-\d{2,3}) \|/, 'caso de teste')

checkSpecBlocks()

const expectedBugs = Array.from({ length: BUG_COUNT }, (_, i) => `BUG-0${i + 1}`)
for (const id of expectedBugs) {
  if (!bugs.has(id)) errors.push(`${SPEC}: defeito ${id} não está especificado`)
}

const references: { pattern: RegExp; known: (match: RegExpExecArray) => boolean }[] = [
  { pattern: /\b(?:RNF|RF)-\d{2}\b/g, known: (m) => requirements.has(m[0]) },
  {
    pattern: /\bBUG-(\d{1,2})\b/g,
    known: (m) => Number(m[1]) >= 1 && Number(m[1]) <= BUG_COUNT,
  },
  { pattern: /\bCT-\d{2,3}\b/g, known: (m) => testCases.has(m[0]) },
  { pattern: /\bD-\d{2}\b/g, known: (m) => decisions.has(m[0]) },
  { pattern: /\bP-\d{2}\b/g, known: (m) => pending.has(m[0]) },
]

const files = ['README.md', ...SCANNED_DIRS.flatMap(walk)].filter((file) =>
  existsSync(join(ROOT, file)),
)
let referenceCount = 0
for (const file of files) {
  read(file)
    .split('\n')
    .forEach((line, index) => {
      for (const { pattern, known } of references) {
        for (const match of line.matchAll(pattern)) {
          referenceCount++
          if (!known(match)) {
            errors.push(`${relative(ROOT, join(ROOT, file))}:${index + 1}: ${match[0]} não existe`)
          }
        }
      }
    })
}

if (existsSync(join(ROOT, MATRIX))) {
  const matrix = read(MATRIX)
  for (const id of requirements) {
    if (!new RegExp(`\\b${id}\\b`).test(matrix)) errors.push(`${MATRIX}: ${id} não está na matriz`)
  }
}

if (errors.length > 0) {
  console.error(`Documentação inconsistente (${errors.length} problema(s)):`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

const rf = [...requirements].filter((id) => id.startsWith('RF-')).length
console.log(
  `Documentação consistente: ${requirements.size} requisitos (${rf} RF, ${requirements.size - rf} RNF), ` +
    `${bugs.size} defeitos, ${decisions.size} decisões, ${testCases.size} casos de teste, ` +
    `${referenceCount} citações verificadas em ${files.length} arquivos.`,
)
