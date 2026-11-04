import type { Metadata } from 'next'
import Link from 'next/link'
import { IssueInvoiceForm, InvoiceList } from '@/components/invoices'
import { IssuedNotice } from '@/components/issued-notice'
import { EmptyState, PageHeader, Section, StatusBadge } from '@/components/ui'
import { ACTION_LABELS } from '@/domain/labels'
import { formatBRL } from '@/domain/money'
import { listInvoices } from '@/server/invoices'
import { listOrders } from '@/server/orders'

export const metadata: Metadata = { title: 'Faturamento' }

export default async function InvoicingPage({
  searchParams,
}: {
  searchParams: Promise<{ emitida?: string }>
}) {
  const { emitida } = await searchParams
  const { invoices, totalInvoicedCents } = listInvoices()
  const pending = [...listOrders('finalized'), ...listOrders('partially_invoiced')].sort(
    (a, b) => b.number - a.number,
  )

  return (
    <>
      <PageHeader
        title="Faturamento"
        description="Notas internas fictícias, totais ou parciais. Cancelar uma nota devolve o valor ao saldo do pedido."
        actions={
          <dl className="sm:text-right">
            <dt id="total-faturado" className="text-sm text-tinta-suave">
              Total faturado
            </dt>
            <dd className="numero text-[28px] leading-tight font-bold [font-stretch:75%]">
              {formatBRL(totalInvoicedCents)}
            </dd>
          </dl>
        }
      />
      <IssuedNotice invoiceId={emitida} />

      <Section
        title="Pedidos a faturar"
        id="a-faturar"
        description="Finalizados ou parcialmente faturados. O saldo inteiro emite a nota total; um valor menor emite uma nota parcial."
      >
        {pending.length === 0 ? (
          <EmptyState title="Nenhum pedido aguardando faturamento.">
            Finalize um pedido em Pedidos para que ele apareça aqui.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-fio border-y border-fio bg-papel">
            {pending.map((order) => (
              <li
                key={order.id}
                className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                  <div>
                    <Link
                      href={`/pedidos/${order.id}`}
                      className="font-medium text-anil underline-offset-2 hover:underline"
                    >
                      Pedido nº {order.number}
                    </Link>
                    <span className="block text-sm text-tinta-suave">{order.customer.name}</span>
                    <span className="mt-1 block text-sm">
                      <StatusBadge status={order.status} />
                    </span>
                  </div>
                  <dl className="numero grid grid-cols-[auto_auto] gap-x-4 text-right text-sm">
                    <dt id={`pedido-${order.id}-total`} className="text-tinta-suave">
                      Total
                    </dt>
                    <dd>{formatBRL(order.totalCents)}</dd>
                    <dt id={`pedido-${order.id}-saldo`} className="text-tinta-suave">
                      Saldo
                    </dt>
                    <dd className="font-semibold">{formatBRL(order.balanceCents)}</dd>
                  </dl>
                </div>
                <IssueInvoiceForm
                  orderId={order.id}
                  orderNumber={order.number}
                  balanceCents={order.balanceCents}
                  compact
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Notas" id="notas" description="Da mais recente para a mais antiga.">
        {invoices.length === 0 ? (
          <EmptyState title="Nenhuma nota emitida ainda.">
            Para emitir a primeira, finalize um pedido e use “{ACTION_LABELS.issueInvoice}” em
            Pedidos a faturar.
          </EmptyState>
        ) : (
          <InvoiceList invoices={invoices} showOrder />
        )}
      </Section>
    </>
  )
}
