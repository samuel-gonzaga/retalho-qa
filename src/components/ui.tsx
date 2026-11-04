/**
 * Componentes de apresentação compartilhados (docs/DESIGN.md, seção 5).
 */
import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { STATUS_LABELS } from '@/domain/labels'
import type { OrderStatus } from '@/domain/order-state'

type Variant = 'primary' | 'secondary' | 'danger' | 'danger-solid'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-anil text-white hover:bg-anil-escuro disabled:bg-borda',
  secondary: 'border border-borda bg-papel text-tinta hover:border-tinta disabled:text-tinta-suave',
  danger: 'border border-carmim bg-papel text-carmim hover:bg-carmim/5 disabled:opacity-60',
  'danger-solid': 'bg-carmim text-white hover:bg-carmim/90 disabled:opacity-60',
}

export function buttonClass(variant: Variant = 'secondary', extra = ''): string {
  return (
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-[2px] px-4 font-medium ' +
    'transition-colors duration-150 disabled:cursor-not-allowed ' +
    `${VARIANTS[variant]} ${extra}`
  )
}

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />
}

export function LinkButton({
  variant = 'secondary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-fio pb-5">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-sm text-tinta-suave">{eyebrow}</div> : null}
        <h1 className="text-2xl leading-tight font-bold [font-stretch:112%] sm:text-[28px]">
          {title}
        </h1>
        {description ? <p className="mt-1 max-w-prose text-tinta-suave">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}

export function Section({
  title,
  description,
  children,
  actions,
  id,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  actions?: ReactNode
  id?: string
}) {
  const headingId = id ?? `secao-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={headingId} className="border-b border-fio py-6 last:border-b-0">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-lg font-semibold">
            {title}
          </h2>
          {description ? <p className="text-sm text-tinta-suave">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

const SWATCHES: Record<OrderStatus, string> = {
  draft: 'bg-cru',
  finalized: 'bg-anil',
  partially_invoiced: 'bg-acafrao',
  invoiced: 'bg-musgo',
  canceled: 'bg-carmim',
}

/** Amostra de cor com o nome do estado: a cor ajuda, o texto informa (RNF-05). */
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className={`size-3 border border-tinta ${SWATCHES[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-borda bg-papel px-5 py-8">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-2 text-tinta-suave">{children}</div> : null}
    </div>
  )
}

export function Notice({
  tone,
  children,
}: {
  tone: 'success' | 'error' | 'info'
  children: ReactNode
}) {
  const styles = {
    success: 'border-musgo text-musgo',
    error: 'border-carmim text-carmim',
    info: 'border-anil text-tinta',
  }[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`border-l-4 bg-papel px-4 py-3 ${styles}`}
    >
      {children}
    </div>
  )
}

/** Lista de termos e valores, com números alinhados à direita. */
export function Summary({
  id,
  rows,
}: {
  id: string
  rows: { term: ReactNode; value: ReactNode; strong?: boolean }[]
}) {
  return (
    <dl className="divide-y divide-fio">
      {rows.map((row, index) => (
        <div
          key={index}
          className={`flex items-baseline justify-between gap-4 py-2 ${row.strong ? 'text-lg font-semibold' : ''}`}
        >
          <dt id={`${id}-${index}`} className={row.strong ? '' : 'text-tinta-suave'}>
            {row.term}
          </dt>
          <dd className="numero text-right">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
