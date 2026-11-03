import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import {
  isBugId,
  isQaPanelEnabled,
  listBugs,
  resetBugOverrides,
  setActiveBugs,
} from '@/domain/bugs'

// Controle dos defeitos para testes automatizados. Mesma regra de ambiente de /qa/defeitos.
export const dynamic = 'force-dynamic'

function panelUnavailable() {
  return NextResponse.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'A área de QA não está disponível neste ambiente.',
      },
    },
    { status: 404 },
  )
}

export function GET() {
  if (!isQaPanelEnabled()) return panelUnavailable()
  return NextResponse.json({ bugs: listBugs() })
}

/** Corpo: { "active": [1, 3] } liga exatamente esses defeitos e desliga os demais. */
export async function PUT(request: Request) {
  if (!isQaPanelEnabled()) return panelUnavailable()
  const body: unknown = await request.json().catch(() => null)
  const active = (body as { active?: unknown } | null)?.active
  if (!Array.isArray(active) || !active.every(isBugId)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_BODY',
          message: 'Envie {"active": [...]} com números de defeito entre 1 e 7.',
        },
      },
      { status: 422 },
    )
  }
  setActiveBugs(active)
  revalidatePath('/', 'layout')
  return NextResponse.json({ bugs: listBugs() })
}

/** Descarta as mudanças em tempo de execução e volta ao RETALHO_BUGS. */
export function DELETE() {
  if (!isQaPanelEnabled()) return panelUnavailable()
  resetBugOverrides()
  revalidatePath('/', 'layout')
  return NextResponse.json({ bugs: listBugs() })
}
