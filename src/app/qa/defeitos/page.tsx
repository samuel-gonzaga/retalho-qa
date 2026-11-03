import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isQaPanelEnabled, listBugs, type BugSource } from '@/domain/bugs'
import { restoreEnvBugs, toggleBug, turnOffAllBugs } from './actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Defeitos intencionais',
  robots: { index: false, follow: false },
}

const SOURCE_LABEL: Record<BugSource, string> = {
  env: 'ligado por RETALHO_BUGS',
  runtime: 'alterado nesta execução do servidor',
  default: 'padrão',
}

export default function DefeitosPage() {
  if (!isQaPanelEnabled()) notFound()

  const bugs = listBugs()
  const envValue = process.env.RETALHO_BUGS?.trim()

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-stone-600">Área de QA</p>
      <h1 className="mt-1 text-2xl font-semibold">Defeitos intencionais</h1>
      <p className="mt-3 text-stone-700">
        Ligue um defeito por vez para reproduzir os cenários dos bug reports. Com todos desligados o
        sistema segue a especificação. Valor de <code>RETALHO_BUGS</code> ao iniciar:{' '}
        <code>{envValue ? envValue : 'vazio'}</code>.
      </p>

      <ul className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
        {bugs.map((bug) => (
          <li key={bug.id} className="flex flex-wrap items-start gap-4 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-medium" id={`defeito-${bug.id}`}>
                Defeito {bug.id} <span className="text-stone-600">· {bug.area}</span>
              </h2>
              <p className="text-sm text-stone-600">
                {bug.active ? 'Ligado' : 'Desligado'} ({SOURCE_LABEL[bug.source]})
              </p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-stone-700">Ver o que muda</summary>
                <p className="mt-2 font-medium">{bug.title}</p>
                <p className="mt-1 text-stone-700">{bug.summary}</p>
              </details>
            </div>
            <form action={toggleBug}>
              <input type="hidden" name="id" value={bug.id} />
              <input type="hidden" name="active" value={String(!bug.active)} />
              <button
                type="submit"
                role="switch"
                aria-checked={bug.active}
                aria-labelledby={`defeito-${bug.id}`}
                className="inline-flex h-8 w-14 items-center rounded-full border border-stone-400 bg-stone-100 px-1 aria-checked:border-stone-900 aria-checked:bg-stone-900"
              >
                <span className="size-6 rounded-full bg-white shadow transition-transform [[aria-checked=true]>&]:translate-x-6" />
              </button>
            </form>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <form action={turnOffAllBugs}>
          <button type="submit" className="rounded border border-stone-400 px-3 py-2 text-sm">
            Desligar todos
          </button>
        </form>
        <form action={restoreEnvBugs}>
          <button type="submit" className="rounded border border-stone-400 px-3 py-2 text-sm">
            Restaurar RETALHO_BUGS
          </button>
        </form>
      </div>
    </main>
  )
}
