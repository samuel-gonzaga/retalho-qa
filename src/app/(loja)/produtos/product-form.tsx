'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { callApi, type FieldErrors } from '@/components/api-client'
import { RadioGroup, TextField } from '@/components/field'
import { buttonClass, LinkButton, Notice } from '@/components/ui'
import { centsToInput, decimalToInput, parseMoneyInput } from '@/domain/format'
import { ACTION_LABELS } from '@/domain/labels'
import { formatBRL } from '@/domain/money'
import { parseDecimalInput, toHundredths } from '@/domain/numbers'
import { rollPriceCents, type Unit } from '@/domain/units'

export type ProductFormValues = {
  id?: number
  code: string
  name: string
  unit: Unit
  priceCents: number | null
  rollLength: number | null
}

const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: 'meter', label: 'Metro' },
  { value: 'roll', label: 'Rolo' },
  { value: 'unit', label: 'Unidade' },
]

export function ProductForm({ product }: { product?: ProductFormValues }) {
  const router = useRouter()
  const [code, setCode] = useState(product?.code ?? '')
  const [name, setName] = useState(product?.name ?? '')
  const [unit, setUnit] = useState<Unit>(product?.unit ?? 'meter')
  const [price, setPrice] = useState(
    product?.priceCents != null ? centsToInput(product.priceCents) : '',
  )
  const [rollLength, setRollLength] = useState(
    product?.rollLength != null ? decimalToInput(product.rollLength) : '',
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<string>()
  const [pending, setPending] = useState(false)

  const priceCents = parseMoneyInput(price)
  const lengthValue = parseDecimalInput(rollLength)
  const lengthCenti = lengthValue === null ? null : toHundredths(lengthValue)
  const rollPreview =
    unit === 'roll' && priceCents !== null && lengthCenti !== null
      ? formatBRL(rollPriceCents(lengthCenti, priceCents))
      : null

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage(undefined)
    const body = {
      code,
      name,
      unit,
      priceCents,
      rollLength: unit === 'roll' ? lengthValue : null,
    }
    const result = product?.id
      ? await callApi('PUT', `/api/products/${product.id}`, body)
      : await callApi('POST', '/api/products', body)
    setPending(false)
    if (result.ok) {
      router.push(`/produtos?salvo=${encodeURIComponent(code)}`)
      router.refresh()
      return
    }
    // O código repetido volta como 409 sem campos: a mensagem pertence ao campo código.
    setErrors(result.status === 409 ? { code: result.message } : result.fields)
    if (result.status !== 409 && Object.keys(result.fields).length === 0) setMessage(result.message)
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 max-w-2xl space-y-5">
      {message ? <Notice tone="error">{message}</Notice> : null}
      <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
        <TextField
          id="code"
          label="Código"
          hint="3 a 12 letras maiúsculas ou números."
          error={errors.code}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoComplete="off"
          spellCheck={false}
          className="[&_input]:font-mono"
        />
        <TextField
          id="name"
          label="Nome"
          error={errors.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
        />
      </div>
      <RadioGroup
        name="unit"
        legend="Unidade de venda"
        options={UNIT_OPTIONS}
        value={unit}
        onChange={setUnit}
        error={errors.unit}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="priceCents"
          label={unit === 'unit' ? 'Preço por unidade (R$)' : 'Preço por metro (R$)'}
          hint="Use vírgula para os centavos, como em 49,90."
          error={errors.priceCents}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          className="[&_input]:numero"
        />
        {unit === 'roll' ? (
          <TextField
            id="rollLength"
            label="Comprimento do rolo (m)"
            hint={rollPreview ? `Preço do rolo: ${rollPreview}.` : 'De 0,01 a 500 m.'}
            error={errors.rollLength}
            value={rollLength}
            onChange={(event) => setRollLength(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            className="[&_input]:numero"
          />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 border-t border-fio pt-5">
        <button type="submit" disabled={pending} className={buttonClass('primary')}>
          {ACTION_LABELS.save}
        </button>
        <LinkButton href="/produtos">{ACTION_LABELS.back}</LinkButton>
      </div>
    </form>
  )
}
