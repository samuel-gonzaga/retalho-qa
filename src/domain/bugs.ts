/**
 * Mecanismo de defeitos intencionais do Retalho (RNF-01).
 *
 * Cada defeito é ligado pela variável de ambiente RETALHO_BUGS (ex.: "1,3,5")
 * ou em tempo de execução pela área /qa/defeitos. Padrão: todos desligados.
 * Todo desvio de comportamento do sistema passa por isBugOn(n), em pontos
 * marcados com o comentário `// BUG-n`.
 */

export const BUG_IDS = [1, 2, 3, 4, 5, 6, 7] as const

export type BugId = (typeof BUG_IDS)[number]

export type BugInfo = {
  id: BugId
  area: string
  title: string
  summary: string
}

export type BugSource = 'env' | 'runtime' | 'default'

export type BugStatus = BugInfo & { active: boolean; source: BugSource }

export const BUG_CATALOG: readonly BugInfo[] = [
  {
    id: 1,
    area: 'Pedido · cálculo',
    title: 'Desconto global não é reaplicado após editar a quantidade',
    summary: 'Ao alterar a quantidade de um item, o total volta a ignorar o desconto global.',
  },
  {
    id: 2,
    area: 'Pedido · conversão de unidade',
    title: 'Preço unitário do rolo ignora a quantidade',
    summary:
      'Rolo de 5 m a R$ 4,00/m com quantidade 4 exibe R$ 5,00 em vez de R$ 20,00. Com quantidade 1 o erro fica escondido.',
  },
  {
    id: 3,
    area: 'Pedido · estados',
    title: 'API aceita alteração em pedido faturado',
    summary: 'PUT em pedido faturado devolve 200 e altera o total, em vez de 409 sem mudança.',
  },
  {
    id: 4,
    area: 'Pedido · parcelas',
    title: 'Parcelas não absorvem a diferença de centavos',
    summary: 'R$ 100,00 em 3 parcelas soma R$ 99,99; a última parcela deveria ser R$ 33,34.',
  },
  {
    id: 5,
    area: 'Faturamento · saldo',
    title: 'Cancelar a nota não devolve o saldo do pedido',
    summary: 'Após cancelar uma nota, o saldo a faturar não volta e o estado do pedido não recua.',
  },
  {
    id: 6,
    area: 'Painel · consistência',
    title: 'Painel mostra faturado diferente da lista de notas',
    summary: 'O total faturado do painel fica preso em cache e não acompanha novas notas.',
  },
  {
    id: 7,
    area: 'Interface · atalho',
    title: 'Botão anuncia o atalho Ctrl+S',
    summary:
      'O botão de salvar anuncia Ctrl+S, combinação que o navegador usa para salvar a página.',
  },
]

type BugState = { overrides: Map<BugId, boolean> }

// Estado guardado em globalThis: o Next pode carregar este módulo em mais de um bundle
// do mesmo processo, e todos precisam enxergar as mesmas chaves ligadas.
const STATE_KEY = '__retalhoBugState'

function state(): BugState {
  const holder = globalThis as typeof globalThis & { [STATE_KEY]?: BugState }
  holder[STATE_KEY] ??= { overrides: new Map() }
  return holder[STATE_KEY]
}

export function isBugId(value: unknown): value is BugId {
  return typeof value === 'number' && (BUG_IDS as readonly number[]).includes(value)
}

export function parseBugList(raw: string | undefined): Set<BugId> {
  const ids = new Set<BugId>()
  for (const token of (raw ?? '').split(',')) {
    const trimmed = token.trim()
    if (!/^\d+$/.test(trimmed)) continue
    const id = Number(trimmed)
    if (isBugId(id)) ids.add(id)
  }
  return ids
}

function bugsFromEnv(): Set<BugId> {
  return parseBugList(process.env.RETALHO_BUGS)
}

export function isBugOn(id: BugId): boolean {
  if (!isBugId(id)) throw new RangeError(`Defeito inexistente: ${String(id)}`)
  return state().overrides.get(id) ?? bugsFromEnv().has(id)
}

export function listBugs(): BugStatus[] {
  const fromEnv = bugsFromEnv()
  const { overrides } = state()
  return BUG_CATALOG.map((bug) => {
    const override = overrides.get(bug.id)
    if (override !== undefined) return { ...bug, active: override, source: 'runtime' }
    const active = fromEnv.has(bug.id)
    return { ...bug, active, source: active ? 'env' : 'default' }
  })
}

export function setBugOverride(id: BugId, active: boolean): void {
  if (!isBugId(id)) throw new RangeError(`Defeito inexistente: ${String(id)}`)
  state().overrides.set(id, active)
}

/** Liga exatamente os defeitos informados e desliga todos os demais. */
export function setActiveBugs(ids: Iterable<BugId>): void {
  const wanted = new Set(ids)
  for (const id of BUG_IDS) setBugOverride(id, wanted.has(id))
}

/** Descarta as mudanças feitas em tempo de execução e volta ao RETALHO_BUGS. */
export function resetBugOverrides(): void {
  state().overrides.clear()
}

/** A área /qa/defeitos só existe fora de produção, salvo liberação explícita. */
export function isQaPanelEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.RETALHO_QA_PAINEL === '1'
}
