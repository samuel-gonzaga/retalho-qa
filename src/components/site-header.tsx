import Link from 'next/link'
import { NavLinks } from './nav-links'

/** Cabeçalho-ourela: sarja índigo, pesponto na navegação e borda redline (docs/DESIGN.md, 3). */
export function SiteHeader() {
  return (
    <header className="sarja text-white">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-end justify-between gap-x-8 px-4 pt-5 lg:px-8">
        <Link href="/" className="mb-3 block rounded-[2px] leading-none">
          <span className="block text-[26px] font-bold tracking-tight [font-stretch:125%]">
            Retalho
          </span>
          <span className="mt-1 block text-sm text-nav">tecidos por metro, rolos e aviamentos</span>
        </Link>
        <NavLinks />
      </div>
      <div className="ourela" aria-hidden>
        <div className="mx-auto flex max-w-[1120px] justify-end px-4 lg:px-8">
          <span className="pt-px font-mono text-[10px] leading-[14px] tracking-[0.08em] text-tinta-suave uppercase">
            dados fictícios · laboratório de QA
          </span>
        </div>
      </div>
    </header>
  )
}
