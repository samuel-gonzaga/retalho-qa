import type { Metadata } from 'next'
import { IssueInvoiceForm, InvoiceList } from '@/components/invoices'
import { IssuedNotice } from '@/components/issued-notice'
import { Notice, PageHeader, Section, StatusBadge, Summary } from '@/components/ui'
import { formatDate, formatDateTime, formatPercent, formatProductPrice } from '@/domain/format'
import { PAYMENT_LABELS, saveButton, STATUS_LABELS } from '@/domain/labels'
import { formatBRL } from '@/domain/money'
import type { OrderStatus } from '@/domain/order-state'
import { listCustomers } from '@/server/customers'
import { listInvoices } from '@/server/invoices'
import { getOrder, type HistoryEntry, type Order } from '@/server/orders'
import { findOrNotFound } from '@/server/page-data'
import { listProducts } from '@/server/products'
import { OrderActions } from './order-actions'
import { OrderConditions } from './order-conditions'
import { OrderItems } from './order-items'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  return { title: `Pedido nº ${(await params).id}` }
}

const INVOICEABLE: OrderStatus[] = ['finalized', 'partially_invoiced']
const WITH_INVOICES: OrderStatus[] = ['finalized', 'partially_invoiced', 'invoiced']

function Totals({ order }: { order: Order }) {
  const rows = [
    { term: 'Subtotal', value: formatBRL(order.subtotalCents) },
    {
      term: `Desconto (${formatPercent(order.discountPct)})`,
      value: `− ${formatBRL(order.discountCents)}`,
    },
    {
      term: 'Frete',
      value: order.freeShipping ? 'Grátis' : formatBRL(order.freightChargedCents),
    },
    { term: 'Total', value: formatBRL(order.totalCents), strong: true },
  ]
  return (
    <div className="border border-fio bg-papel p-4">
      <h2 className="mb-2 font-semibold">Totais</h2>
      <Summary rows={rows} />
      <h3 className="mt-4 mb-1 text-sm font-medium text-tinta-suave">
        {order.installments === 1 ? 'Pagamento à vista' : `Em ${order.installments} parcelas`} ·{' '}
        {PAYMENT_LABELS[order.paymentMethod]}
      </h3>
      <ol className="numero divide-y divide-fio text-sm">
        {order.installmentPlan.map((installment) => (
          <li key={installment.number} className="flex justify-between py-1.5">
            <span>{installment.number}ª parcela</span>
            <span>{formatBRL(installment.amountCents)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-fio pt-3 text-sm text-tinta-suave">
        Frete grátis quando o pagamento é Pix, o CEP do cliente é de entrega própria (
        <span className="whitespace-nowrap">01000-000</span> a{' '}
        <span className="whitespace-nowrap">09999-999</span>) e o valor líquido chega a{' '}
        <span className="whitespace-nowrap">R$ 300,00</span>.
      </p>
    </div>
  )
}

function describe(entry: HistoryEntry): string {
  if (entry.to === 'finalized' && entry.from === 'draft') return 'Pedido finalizado'
  if (entry.to === 'canceled') return 'Pedido cancelado'
  return entry.reason ? 'Nota cancelada' : 'Nota emitida'
}

function History({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-tinta-suave">
        Nenhuma mudança de estado ainda: o pedido está em rascunho.
      </p>
    )
  }
  return (
    <ol className="divide-y divide-fio border-y border-fio bg-papel">
      {entries.map((entry, index) => (
        <li key={index} className="flex flex-wrap justify-between gap-x-6 gap-y-1 px-4 py-3">
          <div>
            <span className="font-medium">{describe(entry)}</span>
            <span className="block text-sm text-tinta-suave">
              {STATUS_LABELS[entry.from]} → {STATUS_LABELS[entry.to]}
              {entry.reason ? ` · ${entry.reason}` : ''}
            </span>
          </div>
          <time dateTime={entry.at} className="numero text-sm text-tinta-suave">
            {formatDateTime(entry.at)}
          </time>
        </li>
      ))}
    </ol>
  )
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ emitida?: string }>
}) {
  const { id } = await params
  const { emitida } = await searchParams
  const order = findOrNotFound(() => getOrder(/^\d+$/.test(id) ? Number(id) : null))
  const editable = order.status === 'draft'
  const invoices = listInvoices().invoices.filter((invoice) => invoice.orderId === order.id)
  const products = editable
    ? listProducts().map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        price: formatProductPrice(product),
      }))
    : []
  const customers = editable
    ? listCustomers().map(({ id: customerId, name, cep }) => ({ id: customerId, name, cep }))
    : []

  return (
    <>
      <PageHeader
        eyebrow="Pedidos"
        title={`Pedido nº ${order.number}`}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge status={order.status} />
            <span>{order.customer.name}</span>
            <span>Criado em {formatDate(order.createdAt)}</span>
          </span>
        }
        actions={<OrderActions orderId={order.id} number={order.number} status={order.status} />}
      />

      <IssuedNotice invoiceId={emitida} />
      {order.status === 'canceled' ? (
        <div className="mt-5">
          <Notice tone="info">Pedido cancelado. Motivo: {order.cancelReason}</Notice>
        </div>
      ) : null}
      {!editable && order.status !== 'canceled' ? (
        <p className="mt-5 text-tinta-suave">
          Pedido {STATUS_LABELS[order.status].toLowerCase()}: itens e condições estão congelados.
        </p>
      ) : null}

      {/* No celular os totais vêm logo depois das condições; no desktop ficam na coluna fixa. */}
      <div className="mt-2 grid gap-x-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Section title="Itens" id="itens">
            <OrderItems
              orderId={order.id}
              editable={editable}
              items={order.items}
              products={products}
            />
          </Section>

          <Section title="Condições" id="condicoes">
            {editable ? (
              <OrderConditions
                orderId={order.id}
                values={{
                  customerId: order.customer.id,
                  discountPct: order.discountPct,
                  freightCents: order.freightCents,
                  paymentMethod: order.paymentMethod,
                  installments: order.installments,
                }}
                customers={customers}
                saveButton={saveButton()}
              />
            ) : (
              <Summary
                rows={[
                  { term: 'Cliente', value: order.customer.name },
                  { term: 'Desconto global', value: formatPercent(order.discountPct) },
                  { term: 'Frete informado', value: formatBRL(order.freightCents) },
                  { term: 'Forma de pagamento', value: PAYMENT_LABELS[order.paymentMethod] },
                  { term: 'Parcelas', value: order.installments },
                ]}
              />
            )}
          </Section>
        </div>

        <aside
          className="pt-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
          aria-label="Totais do pedido"
        >
          <Totals order={order} />
        </aside>

        <div className="mt-6 min-w-0 border-t border-fio lg:col-start-1 lg:row-start-2 lg:mt-0">
          {WITH_INVOICES.includes(order.status) || invoices.length > 0 ? (
            <Section
              title="Faturamento"
              id="faturamento"
              description="Notas internas fictícias. Cancelar uma nota devolve o valor ao saldo."
            >
              <Summary
                rows={[
                  { term: 'Total do pedido', value: formatBRL(order.totalCents) },
                  { term: 'Faturado', value: formatBRL(order.invoicedCents) },
                  { term: 'Saldo a faturar', value: formatBRL(order.balanceCents), strong: true },
                ]}
              />
              {INVOICEABLE.includes(order.status) ? (
                <div className="mt-5">
                  <IssueInvoiceForm
                    orderId={order.id}
                    orderNumber={order.number}
                    balanceCents={order.balanceCents}
                  />
                </div>
              ) : null}
              {invoices.length > 0 ? (
                <div className="mt-5">
                  <InvoiceList invoices={invoices} />
                </div>
              ) : null}
            </Section>
          ) : null}

          <Section title="Histórico" id="historico">
            <History entries={order.history} />
          </Section>
        </div>
      </div>
    </>
  )
}
