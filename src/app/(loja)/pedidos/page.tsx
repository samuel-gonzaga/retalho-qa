import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, LinkButton, PageHeader, StatusBadge } from '@/components/ui'
import { formatDate } from '@/domain/format'
import { ACTION_LABELS, STATUS_LABELS } from '@/domain/labels'
import { formatBRL } from '@/domain/money'
import { isOrderStatus, ORDER_STATUSES, type OrderStatus } from '@/domain/order-state'
import { listOrders } from '@/server/orders'

export const metadata: Metadata = { title: 'Pedidos' }

function StatusFilter({ current }: { current: OrderStatus | null }) {
  const options: { href: string; label: string; value: OrderStatus | null }[] = [
    { href: '/pedidos', label: 'Todos', value: null },
    ...ORDER_STATUSES.map((status) => ({
      href: `/pedidos?estado=${status}`,
      label: STATUS_LABELS[status],
      value: status,
    })),
  ]
  return (
    <nav aria-label="Filtrar por estado" className="mt-6">
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => (
          <li key={option.label}>
            <Link
              href={option.href}
              aria-current={option.value === current ? 'page' : undefined}
              className="inline-flex min-h-11 items-center rounded-[2px] border border-borda bg-papel px-3 text-sm hover:border-tinta aria-[current=page]:border-anil aria-[current=page]:bg-anil aria-[current=page]:text-white"
            >
              {option.value ? <StatusBadge status={option.value} /> : option.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams
  const status = isOrderStatus(estado) ? estado : null
  const orders = listOrders(status)

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Do rascunho ao faturamento. Só pedidos em rascunho aceitam alterações."
        actions={
          <LinkButton href="/pedidos/novo" variant="primary">
            {ACTION_LABELS.newOrder}
          </LinkButton>
        }
      />
      <StatusFilter current={status} />
      <div className="mt-6">
        {orders.length === 0 ? (
          status ? (
            <EmptyState title={`Nenhum pedido em “${STATUS_LABELS[status]}”.`}>
              Escolha outro estado ou veja todos os pedidos.
            </EmptyState>
          ) : (
            <EmptyState title="Nenhum pedido ainda.">
              Crie o primeiro em “{ACTION_LABELS.newOrder}”, a partir de um cliente cadastrado.
            </EmptyState>
          )
        ) : (
          <table className="tabela w-full border-y border-fio bg-papel">
            <caption className="sr-only">
              Pedidos{status ? ` em ${STATUS_LABELS[status]}` : ''}
            </caption>
            <thead className="border-b border-fio text-left text-sm text-tinta-suave">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Pedido
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Cliente
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Estado
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fio">
              {orders.map((order) => (
                <tr key={order.id} className="max-sm:px-4">
                  <td data-label="" className="px-4 py-3">
                    <Link
                      href={`/pedidos/${order.id}`}
                      className="font-medium text-anil underline-offset-2 hover:underline"
                    >
                      Pedido nº {order.number}
                    </Link>
                    <span className="block text-sm text-tinta-suave">
                      Criado em {formatDate(order.createdAt)}
                    </span>
                  </td>
                  <td data-label="Cliente" className="px-4 py-3">
                    {order.customer.name}
                  </td>
                  <td data-label="Estado" className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td data-label="Total" className="numero px-4 py-3 text-right">
                    {formatBRL(order.totalCents)}
                  </td>
                  <td data-label="Saldo" className="numero px-4 py-3 text-right">
                    {formatBRL(order.balanceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
