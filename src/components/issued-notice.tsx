import { Notice } from './ui'
import { formatInvoiceNumber } from '@/domain/format'
import { formatBRL } from '@/domain/money'
import { listInvoices } from '@/server/invoices'

/** Confirmação de nota emitida, lida de `?emitida=<id>` para sobreviver ao formulário sumir. */
export function IssuedNotice({ invoiceId }: { invoiceId: string | undefined }) {
  if (!invoiceId) return null
  const invoice = listInvoices().invoices.find((item) => String(item.id) === invoiceId)
  if (!invoice) return null
  return (
    <div className="mt-5">
      <Notice tone="success">
        Nota {formatInvoiceNumber(invoice.number)} emitida para o pedido nº {invoice.orderNumber}:{' '}
        {formatBRL(invoice.amountCents)}.
      </Notice>
    </div>
  )
}
