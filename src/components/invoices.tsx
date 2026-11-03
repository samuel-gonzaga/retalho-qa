'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { callApi } from './api-client'
import { TextField } from './field'
import { ReasonDialog } from './reason-dialog'
import { buttonClass, Notice } from './ui'
import { centsToInput, formatDateTime, formatInvoiceNumber, parseMoneyInput } from '@/domain/format'
import { ACTION_LABELS, INVOICE_STATUS_LABELS } from '@/domain/labels'
import { formatBRL } from '@/domain/money'

export type InvoiceView = {
  id: number
  number: number
  orderId: number
  orderNumber: number
  customerName: string
  amountCents: number
  status: 'issued' | 'canceled'
  issuedAt: string
  cancelReason: string | null
}

/** RF-32: o saldo vem sugerido; um valor menor emite nota parcial. */
export function IssueInvoiceForm({
  orderId,
  orderNumber,
  balanceCents,
  compact = false,
}: {
  orderId: number
  orderNumber: number
  balanceCents: number
  compact?: boolean
}) {
  const router = useRouter()
  const [amount, setAmount] = useState(centsToInput(balanceCents))
  // Quando o saldo muda (outra nota emitida ou cancelada), o valor sugerido acompanha.
  const [suggestedFor, setSuggestedFor] = useState(balanceCents)
  if (suggestedFor !== balanceCents) {
    setSuggestedFor(balanceCents)
    setAmount(centsToInput(balanceCents))
  }
  const [error, setError] = useState<string>()
  const [issued, setIssued] = useState<string>()
  const [pending, setPending] = useState(false)
  const fieldId = `valor-nota-${orderId}`

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    setIssued(undefined)
    const result = await callApi<{ invoice: InvoiceView }>(
      'POST',
      `/api/orders/${orderId}/invoices`,
      { amountCents: parseMoneyInput(amount) },
    )
    setPending(false)
    if (!result.ok) {
      setError(result.fields.amountCents ?? result.message)
      return
    }
    setIssued(
      `Nota ${formatInvoiceNumber(result.data.invoice.number)} emitida: ${formatBRL(result.data.invoice.amountCents)}.`,
    )
    router.refresh()
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {issued ? <Notice tone="success">{issued}</Notice> : null}
      <div className="flex items-start gap-3">
        <TextField
          id={fieldId}
          label={
            <>
              Valor da nota <span className="sr-only">do pedido nº {orderNumber} </span>(R$)
            </>
          }
          hint={
            compact
              ? undefined
              : 'O saldo inteiro emite a nota total; um valor menor emite uma nota parcial.'
          }
          error={error}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          className="[&_input]:numero min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={pending}
          className={buttonClass('primary', 'mt-7 shrink-0')}
        >
          {ACTION_LABELS.issueInvoice}
        </button>
      </div>
    </form>
  )
}

function CancelInvoice({ invoice }: { invoice: InvoiceView }) {
  const router = useRouter()
  const number = formatInvoiceNumber(invoice.number)
  return (
    <ReasonDialog
      triggerLabel={ACTION_LABELS.cancelInvoice}
      triggerAriaLabel={`${ACTION_LABELS.cancelInvoice} ${number}`}
      title={`${ACTION_LABELS.cancelInvoice} ${number}`}
      description={`O valor de ${formatBRL(invoice.amountCents)} volta ao saldo do pedido nº ${invoice.orderNumber}.`}
      confirmLabel={ACTION_LABELS.cancelInvoice}
      onConfirm={async (reason) => {
        const result = await callApi('POST', `/api/invoices/${invoice.id}/cancel`, { reason })
        if (result.ok) router.refresh()
        return result
      }}
    />
  )
}

/** RF-35: notas da mais recente para a mais antiga, com a situação de cada uma. */
export function InvoiceList({
  invoices,
  showOrder = false,
}: {
  invoices: InvoiceView[]
  showOrder?: boolean
}) {
  return (
    <table className="tabela w-full border-y border-fio bg-papel">
      <caption className="sr-only">Notas emitidas</caption>
      <thead className="border-b border-fio text-left text-sm text-tinta-suave">
        <tr>
          <th scope="col" className="px-4 py-2 font-medium">
            Nota
          </th>
          {showOrder ? (
            <th scope="col" className="px-4 py-2 font-medium">
              Pedido
            </th>
          ) : null}
          <th scope="col" className="px-4 py-2 text-right font-medium">
            Valor
          </th>
          <th scope="col" className="px-4 py-2 font-medium">
            Situação
          </th>
          <th scope="col" className="px-4 py-2 font-medium">
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-fio">
        {invoices.map((invoice) => (
          <tr key={invoice.id} className="max-sm:px-4">
            <td data-label="" className="px-4 py-3">
              <span className="font-mono font-medium">{formatInvoiceNumber(invoice.number)}</span>
              <span className="block text-sm text-tinta-suave">
                Emitida em {formatDateTime(invoice.issuedAt)}
              </span>
            </td>
            {showOrder ? (
              <td data-label="Pedido" className="px-4 py-3">
                <Link
                  href={`/pedidos/${invoice.orderId}`}
                  className="text-anil underline-offset-2 hover:underline"
                >
                  nº {invoice.orderNumber}
                </Link>
                <span className="block text-sm text-tinta-suave">{invoice.customerName}</span>
              </td>
            ) : null}
            <td data-label="Valor" className="numero px-4 py-3 text-right">
              {formatBRL(invoice.amountCents)}
            </td>
            <td data-label="Situação" className="px-4 py-3">
              {INVOICE_STATUS_LABELS[invoice.status]}
              {invoice.cancelReason ? (
                <span className="block text-sm text-tinta-suave">{invoice.cancelReason}</span>
              ) : null}
            </td>
            <td data-label="" className="px-4 py-3 text-right">
              {invoice.status === 'issued' ? <CancelInvoice invoice={invoice} /> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
