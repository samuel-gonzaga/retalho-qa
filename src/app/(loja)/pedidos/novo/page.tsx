import type { Metadata } from 'next'
import { EmptyState, LinkButton, PageHeader } from '@/components/ui'
import { ACTION_LABELS } from '@/domain/labels'
import { listCustomers } from '@/server/customers'
import { NewOrderForm } from './new-order-form'

export const metadata: Metadata = { title: ACTION_LABELS.newOrder }

export default function NewOrderPage() {
  const customers = listCustomers().map(({ id, name }) => ({ id, name }))
  return (
    <>
      <PageHeader eyebrow="Pedidos" title={ACTION_LABELS.newOrder} />
      {customers.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Ainda não há clientes para o pedido.">
            <p>Cadastre um cliente antes de criar o primeiro pedido.</p>
            <LinkButton href="/clientes/novo" variant="primary" className="mt-4">
              {ACTION_LABELS.newCustomer}
            </LinkButton>
          </EmptyState>
        </div>
      ) : (
        <NewOrderForm customers={customers} />
      )}
    </>
  )
}
