'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Painel' },
  { href: '/pedidos', label: 'Pedidos' },
  { href: '/faturamento', label: 'Faturamento' },
  { href: '/produtos', label: 'Produtos' },
  { href: '/clientes', label: 'Clientes' },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav aria-label="Principal" className="-mx-2">
      <ul className="flex flex-wrap">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className="pesponto block px-2 pt-2 pb-4 text-[15px] text-nav transition-colors duration-150 hover:text-white aria-[current=page]:text-white sm:px-3"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
