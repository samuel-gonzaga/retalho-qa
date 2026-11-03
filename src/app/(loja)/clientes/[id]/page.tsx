import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui'
import { getCustomer } from '@/server/customers'
import { findOrNotFound } from '@/server/page-data'
import { CustomerForm } from '../customer-form'

export const metadata: Metadata = { title: 'Cliente' }

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = findOrNotFound(() => getCustomer(/^\d+$/.test(id) ? Number(id) : null))
  return (
    <>
      <PageHeader
        eyebrow="Clientes"
        title={customer.name}
        description="Mudar o CEP recalcula os rascunhos do cliente; pedidos finalizados não mudam."
      />
      <CustomerForm customer={customer} />
    </>
  )
}
