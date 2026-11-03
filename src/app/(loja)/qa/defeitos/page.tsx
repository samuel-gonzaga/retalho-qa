import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buttonClass, PageHeader } from '@/components/ui'
import { isQaPanelEnabled, listBugs, type BugSource } from '@/domain/bugs'
import { restoreEnvBugs, toggleBug, turnOffAllBugs } from './actions'

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
    <>
      <PageHeader
        eyebrow="Área de QA"
        title="Defeitos intencionais"
        description={
          <>
            Ligue um defeito por vez para reproduzir os cenários dos bug reports. Com todos
            desligados, o sistema segue a especificação. As mudanças valem até o servidor reiniciar.
            Valor de <code className="font-mono">RETALHO_BUGS</code> ao iniciar:{' '}
            <code className="font-mono">{envValue ? envValue : 'vazio'}</code>.
          </>
        }
      />

      <ul className="mt-6 divide-y divide-fio border-y border-fio bg-papel">
        {bugs.map((bug) => (
          <li key={bug.id} className="flex items-start gap-4 px-4 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-medium" id={`defeito-${bug.id}`}>
                Defeito {bug.id} <span className="text-tinta-suave">· {bug.area}</span>
              </h2>
              <p className="text-sm text-tinta-suave">
                {bug.active ? 'Ligado' : 'Desligado'} ({SOURCE_LABEL[bug.source]})
              </p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-anil">Ver o que muda</summary>
                <p className="mt-2 font-medium">{bug.title}</p>
                <p className="mt-1 text-tinta-suave">{bug.summary}</p>
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
                className="group inline-flex h-11 w-16 items-center rounded-[2px] border border-borda bg-fundo px-1 transition-colors duration-150 aria-checked:border-carmim aria-checked:bg-carmim"
              >
                <span className="size-8 rounded-[2px] border border-borda bg-papel transition-transform duration-150 group-aria-checked:translate-x-6 group-aria-checked:border-carmim" />
              </button>
            </form>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <form action={turnOffAllBugs}>
          <button type="submit" className={buttonClass('secondary')}>
            Desligar todos
          </button>
        </form>
        <form action={restoreEnvBugs}>
          <button type="submit" className={buttonClass('secondary')}>
            Restaurar RETALHO_BUGS
          </button>
        </form>
      </div>
    </>
  )
}
