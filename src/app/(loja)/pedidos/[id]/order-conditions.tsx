'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { callApi, type FieldErrors } from '@/components/api-client'
import { RadioGroup, SelectField, TextField } from '@/components/field'
import { buttonClass, Notice } from '@/components/ui'
import { centsToInput, decimalToInput, parseMoneyInput } from '@/domain/format'
import { PAYMENT_LABELS, type ButtonLabel } from '@/domain/labels'
import { parseDecimalInput } from '@/domain/numbers'
import type { PaymentMethod } from '@/domain/pricing'

export type ConditionsValues = {
  customerId: number
  discountPct: number
  freightCents: number
  paymentMethod: PaymentMethod
  installments: number
}

const PAYMENT_OPTIONS = (Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_LABELS[value],
}))

/** RF-18 a RF-22: o PUT do cabeçalho. O rótulo do botão vem do servidor (RF-40). */
export function OrderConditions({
  orderId,
  values,
  customers,
  saveButton,
}: {
  orderId: number
  values: ConditionsValues
  customers: { id: number; name: string; cep: string }[]
  saveButton: ButtonLabel
}) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState(String(values.customerId))
  const [discount, setDiscount] = useState(decimalToInput(values.discountPct))
  const [freight, setFreight] = useState(centsToInput(values.freightCents))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(values.paymentMethod)
  const [installments, setInstallments] = useState(String(values.installments))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>()
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setErrors({})
    setMessage(undefined)
    const result = await callApi('PUT', `/api/orders/${orderId}`, {
      customerId: Number(customerId),
      discountPct: parseDecimalInput(discount),
      freightCents: parseMoneyInput(freight),
      paymentMethod,
      installments: Number(installments),
    })
    setPending(false)
    if (result.ok) {
      setMessage({ tone: 'success', text: 'Condições salvas. Os totais foram recalculados.' })
      router.refresh()
      return
    }
    setErrors(result.fields)
    if (Object.keys(result.fields).length === 0) {
      setMessage({ tone: 'error', text: result.message })
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <SelectField
        id="customerId"
        label="Cliente"
        error={errors.customerId}
        value={customerId}
        onChange={(event) => setCustomerId(event.target.value)}
      >
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name} · CEP {customer.cep}
          </option>
        ))}
      </SelectField>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="discountPct"
          label="Desconto global (%)"
          hint="De 0 a 100, com até 2 casas decimais."
          error={errors.discountPct}
          value={discount}
          onChange={(event) => setDiscount(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          className="[&_input]:numero"
        />
        <TextField
          id="freightCents"
          label="Frete informado (R$)"
          hint="De R$ 0,00 a R$ 9.999,99."
          error={errors.freightCents}
          value={freight}
          onChange={(event) => setFreight(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          className="[&_input]:numero"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <RadioGroup
          name="paymentMethod"
          legend="Forma de pagamento"
          options={PAYMENT_OPTIONS}
          value={paymentMethod}
          onChange={setPaymentMethod}
          error={errors.paymentMethod}
        />
        <SelectField
          id="installments"
          label="Parcelas"
          error={errors.installments}
          value={installments}
          onChange={(event) => setInstallments(event.target.value)}
        >
          <option value="1">1 parcela</option>
          <option value="2">2 parcelas</option>
          <option value="3">3 parcelas</option>
        </SelectField>
      </div>
      <button
        type="submit"
        disabled={pending}
        aria-keyshortcuts={saveButton.ariaKeyShortcuts}
        className={buttonClass('primary')}
      >
        {saveButton.text}
      </button>
    </form>
  )
}
