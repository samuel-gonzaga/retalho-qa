import {
  isBugId,
  isQaPanelEnabled,
  listBugs,
  resetBugOverrides,
  setActiveBugs,
} from '@/domain/bugs'
import { FIELD_MESSAGES as M } from '@/domain/messages'
import { ApiError, validationError } from '@/server/errors'
import { handle, json, readBody, requireJson } from '@/server/http'

// Controle dos defeitos para testes automatizados. Mesma regra de ambiente de /qa/defeitos.
export const dynamic = 'force-dynamic'

function assertPanelEnabled(): void {
  if (!isQaPanelEnabled()) {
    throw new ApiError('NOT_FOUND', 'A área de QA não está disponível neste ambiente.')
  }
}

export const GET = handle(async () => {
  assertPanelEnabled()
  return json({ bugs: listBugs() })
})

/** Corpo: { "active": [1, 3] } liga exatamente esses defeitos e desliga os demais. */
export const PUT = handle(async (request: Request) => {
  assertPanelEnabled()
  const body = requireJson(await readBody(request))
  const active = (body as { active?: unknown } | null)?.active
  if (!Array.isArray(active) || !active.every(isBugId)) {
    throw validationError({ active: M.bugList })
  }
  setActiveBugs(active)
  return json({ bugs: listBugs() })
})

/** Descarta as mudanças em tempo de execução e volta ao RETALHO_BUGS. */
export const DELETE = handle(async () => {
  assertPanelEnabled()
  resetBugOverrides()
  return json({ bugs: listBugs() })
})
