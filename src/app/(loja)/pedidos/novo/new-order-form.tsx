'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { callApi } from '@/components/api-client'
import { SelectField } from '@/components/field'
import { buttonClass, LinkButton } from '@/components/ui'
import { ACTION_LABELS } from '@/domain/labels'

export function NewOrderForm({ customers }: { customers: { id: number; name: string }[] }) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    const result = await callApi<{ order: { id: number } }>('POST', '/api/orders', {
      customerId: customerId ? Number(customerId) : null,
    })
    if (result.ok) {
      router.push(`/pedidos/${result.data.order.id}`)
      return
    }
    setPending(false)
    setError(result.fields.customerId ?? result.message)
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 max-w-xl space-y-5">
      <SelectField
        id="customerId"
        label="Cliente"
        hint={
          'O pedido começa em rascunho, com desconto de 0 %, frete de R$ 0,00, Pix e 1 parcela.'
        }
        error={error}
        value={customerId}
        onChange={(event) => setCustomerId(event.target.value)}
      >
        <option value="">Escolha um cliente</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))}
      </SelectField>
      <div className="flex flex-wrap gap-3 border-t border-fio pt-5">
        <button type="submit" disabled={pending} className={buttonClass('primary')}>
          {ACTION_LABELS.save}
        </button>
        <LinkButton href="/pedidos">{ACTION_LABELS.back}</LinkButton>
      </div>
    </form>
  )
}
