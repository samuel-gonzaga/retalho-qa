import type { Metadata } from 'next'
import { LinkButton, PageHeader } from '@/components/ui'
import { formatBRL } from '@/domain/money'
import { getDashboard } from '@/server/dashboard'

export const metadata: Metadata = { title: 'Painel' }

function Figure({
  id,
  label,
  cents,
  note,
}: {
  id: string
  label: string
  cents: number
  note: string
}) {
  return (
    <div className="py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
      <dt id={id} className="font-medium">
        {label}
      </dt>
      <dd className="numero mt-1 text-[40px] leading-[44px] font-bold [font-stretch:75%]">
        {formatBRL(cents)}
      </dd>
      <dd className="mt-1 text-sm text-tinta-suave">{note}</dd>
    </div>
  )
}

/** Fita proporcional do vendido, com marcas a cada 10 % como numa fita métrica. */
function SoldTape({
  soldCents,
  invoicedCents,
  toInvoiceCents,
}: {
  soldCents: number
  invoicedCents: number
  toInvoiceCents: number
}) {
  const percent = (cents: number) => Math.round((cents / soldCents) * 100)
  const invoicedWidth = Math.min(100, (invoicedCents / soldCents) * 100)
  const toInvoiceWidth = Math.min(100 - invoicedWidth, (toInvoiceCents / soldCents) * 100)
  return (
    <figure className="mt-8">
      <figcaption className="mb-2 text-sm text-tinta-suave">
        Do vendido, {percent(invoicedCents)} % está faturado e {percent(toInvoiceCents)} % está a
        faturar.
      </figcaption>
      <div aria-hidden className="relative h-6 border border-tinta bg-papel">
        <div className="absolute inset-y-0 left-0 bg-anil" style={{ width: `${invoicedWidth}%` }} />
        <div
          className="absolute inset-y-0 bg-acafrao"
          style={{ left: `${invoicedWidth}%`, width: `${toInvoiceWidth}%` }}
        />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,var(--color-tinta)_0_1px,transparent_1px_10%)] opacity-40" />
      </div>
      <div aria-hidden className="mt-1 flex justify-between font-mono text-[11px] text-tinta-suave">
        <span>0</span>
        <span>50 %</span>
        <span>100 %</span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 border border-tinta bg-anil" /> Faturado
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 border border-tinta bg-acafrao" /> A faturar
        </li>
      </ul>
    </figure>
  )
}

export default function DashboardPage() {
  const dashboard = getDashboard()
  return (
    <>
      <PageHeader
        title="Painel"
        description="O que já foi vendido, o que virou nota e o que ainda falta faturar."
        actions={
          <>
            <LinkButton href="/pedidos">Ver pedidos</LinkButton>
            <LinkButton href="/faturamento" variant="primary">
              Ir ao faturamento
            </LinkButton>
          </>
        }
      />
      <dl className="grid divide-fio border-b border-fio max-sm:divide-y sm:grid-cols-3 sm:divide-x">
        <Figure
          id="painel-vendido"
          label="Vendido"
          cents={dashboard.soldCents}
          note="Pedidos finalizados, parcialmente faturados e faturados."
        />
        <Figure
          id="painel-faturado"
          label="Faturado"
          cents={dashboard.invoicedCents}
          note="Notas emitidas e não canceladas."
        />
        <Figure
          id="painel-a-faturar"
          label="A faturar"
          cents={dashboard.toInvoiceCents}
          note="Saldo dos pedidos finalizados e parcialmente faturados."
        />
      </dl>
      {dashboard.soldCents > 0 ? (
        <SoldTape {...dashboard} />
      ) : (
        <p className="mt-8 text-tinta-suave">
          Ainda não há vendas. Finalize um pedido para que ele entre no vendido.
        </p>
      )}
    </>
  )
}
