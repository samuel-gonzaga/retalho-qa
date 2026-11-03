'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { callApi } from '@/components/api-client'
import { ReasonDialog } from '@/components/reason-dialog'
import { Button, Notice } from '@/components/ui'
import { ACTION_LABELS } from '@/domain/labels'
import type { OrderStatus } from '@/domain/order-state'

/** RF-28, RF-29: finalizar (protegido contra duplo clique) e cancelar com motivo. */
export function OrderActions({
  orderId,
  number,
  status,
}: {
  orderId: number
  number: number
  status: OrderStatus
}) {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  const canFinalize = status === 'draft'
  const canCancel = status === 'draft' || status === 'finalized'

  if (!canFinalize && !canCancel) return null

  async function finalize() {
    setPending(true)
    setError(undefined)
    const result = await callApi('POST', `/api/orders/${orderId}/finalize`)
    setPending(false)
    if (result.ok) router.refresh()
    else setError(result.message)
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:items-end">
      <div className="flex flex-wrap gap-3">
        {canCancel ? (
          <ReasonDialog
            triggerLabel={ACTION_LABELS.cancelOrder}
            title={`${ACTION_LABELS.cancelOrder} nº ${number}`}
            description="O pedido sai do vendido no painel e não poderá ser reaberto."
            confirmLabel={ACTION_LABELS.cancelOrder}
            onConfirm={async (reason) => {
              const result = await callApi('POST', `/api/orders/${orderId}/cancel`, { reason })
              if (result.ok) router.refresh()
              return result
            }}
          />
        ) : null}
        {canFinalize ? (
          <Button variant="primary" onClick={finalize} disabled={pending}>
            {ACTION_LABELS.finalizeOrder}
          </Button>
        ) : null}
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  )
}
