import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { isQaPanelEnabled } from '@/domain/bugs'

// Todas as telas leem o banco a cada requisição.
export const dynamic = 'force-dynamic'

export default function StoreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only bg-papel px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-[1120px] px-4 py-8 lg:px-8">
        {children}
      </main>
      <footer className="mx-auto max-w-[1120px] px-4 pb-10 text-sm text-tinta-suave lg:px-8">
        <p>
          O Retalho é uma loja fictícia, criada como laboratório de QA. Todos os dados são gerados
          por script.
          {isQaPanelEnabled() ? (
            <>
              {' '}
              <Link href="/qa/defeitos" className="underline underline-offset-2">
                Área de QA
              </Link>
            </>
          ) : null}
        </p>
      </footer>
    </>
  )
}
