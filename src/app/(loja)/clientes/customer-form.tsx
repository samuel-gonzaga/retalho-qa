'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { callApi, type FieldErrors } from '@/components/api-client'
import { RadioGroup, TextField } from '@/components/field'
import { buttonClass, LinkButton, Notice } from '@/components/ui'
import { ACTION_LABELS } from '@/domain/labels'

type CustomerType = 'PF' | 'PJ'

export type CustomerFormValues = {
  id?: number
  type: CustomerType
  name: string
  documentFormatted: string
  cep: string
}

const TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'PF', label: 'Pessoa física (PF)' },
  { value: 'PJ', label: 'Pessoa jurídica (PJ)' },
]

export function CustomerForm({ customer }: { customer?: CustomerFormValues }) {
  const router = useRouter()
  const [type, setType] = useState<CustomerType>(customer?.type ?? 'PF')
  const [name, setName] = useState(customer?.name ?? '')
  const [document, setDocument] = useState(customer?.documentFormatted ?? '')
  const [cep, setCep] = useState(customer?.cep ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<string>()
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage(undefined)
    const body = { type, name, document, cep }
    const result = customer?.id
      ? await callApi('PUT', `/api/customers/${customer.id}`, body)
      : await callApi('POST', '/api/customers', body)
    setPending(false)
    if (result.ok) {
      router.push(`/clientes?salvo=${encodeURIComponent(name.trim())}`)
      router.refresh()
      return
    }
    // O documento repetido volta como 409 sem campos: a mensagem pertence ao campo documento.
    setErrors(result.status === 409 ? { document: result.message } : result.fields)
    if (result.status !== 409 && Object.keys(result.fields).length === 0) setMessage(result.message)
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 max-w-2xl space-y-5">
      {message ? <Notice tone="error">{message}</Notice> : null}
      <RadioGroup
        name="type"
        legend="Tipo de cliente"
        options={TYPE_OPTIONS}
        value={type}
        onChange={setType}
        error={errors.type}
      />
      <TextField
        id="name"
        label={type === 'PF' ? 'Nome' : 'Razão social'}
        error={errors.name}
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoComplete="off"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="document"
          label={type === 'PF' ? 'CPF' : 'CNPJ'}
          hint={
            type === 'PF'
              ? 'Com ou sem pontuação: 000.000.000-00.'
              : 'Com ou sem pontuação. Aceita o CNPJ com letras.'
          }
          error={errors.document}
          value={document}
          onChange={(event) => setDocument(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="[&_input]:font-mono"
        />
        <TextField
          id="cep"
          label="CEP"
          hint={
            <>
              8 dígitos, com ou sem hífen. De <span className="whitespace-nowrap">01000-000</span> a{' '}
              <span className="whitespace-nowrap">09999-999</span> a entrega é própria.
            </>
          }
          error={errors.cep}
          value={cep}
          onChange={(event) => setCep(event.target.value)}
          inputMode="numeric"
          autoComplete="off"
          className="[&_input]:font-mono"
        />
      </div>
      <div className="flex flex-wrap gap-3 border-t border-fio pt-5">
        <button type="submit" disabled={pending} className={buttonClass('primary')}>
          {ACTION_LABELS.save}
        </button>
        <LinkButton href="/clientes">{ACTION_LABELS.back}</LinkButton>
      </div>
    </form>
  )
}
