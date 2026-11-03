import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui'
import { ACTION_LABELS } from '@/domain/labels'
import { CustomerForm } from '../customer-form'

export const metadata: Metadata = { title: ACTION_LABELS.newCustomer }

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader
        eyebrow="Clientes"
        title={ACTION_LABELS.newCustomer}
        description="O documento é conferido pelos dígitos verificadores e não pode se repetir."
      />
      <CustomerForm />
    </>
  )
}
