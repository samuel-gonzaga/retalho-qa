'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import type { ApiResult } from './api-client'
import { TextAreaField } from './field'
import { Button, buttonClass } from './ui'
import { ACTION_LABELS } from '@/domain/labels'

/**
 * Diálogo de cancelamento com motivo (RF-29, RF-34). Usa <dialog> nativo: prende o foco, fecha
 * com Esc e devolve o foco ao botão que o abriu.
 */
export function ReasonDialog({
  triggerLabel,
  triggerAriaLabel,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  triggerLabel: string
  triggerAriaLabel?: string
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: (reason: string) => Promise<ApiResult<unknown>>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  function open() {
    setReason('')
    setError(undefined)
    dialogRef.current?.showModal()
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    const result = await onConfirm(reason)
    setPending(false)
    if (result.ok) {
      dialogRef.current?.close()
    } else {
      setError(result.message)
    }
  }

  const length = reason.trim().length

  return (
    <>
      <Button variant="danger" onClick={open} aria-label={triggerAriaLabel}>
        {triggerLabel}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-titulo`}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] border border-tinta bg-papel p-0 text-tinta backdrop:bg-tinta/40"
      >
        <form onSubmit={confirm} className="p-5">
          <h2 id={`${id}-titulo`} className="text-lg font-semibold">
            {title}
          </h2>
          <div className="mt-1 text-tinta-suave">{description}</div>
          <TextAreaField
            id={`${id}-motivo`}
            label="Motivo"
            hint={`De 10 a 200 caracteres. ${length} até agora.`}
            error={error}
            rows={3}
            maxLength={250}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-4"
          />
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button onClick={() => dialogRef.current?.close()}>{ACTION_LABELS.back}</Button>
            <button type="submit" disabled={pending} className={buttonClass('danger-solid')}>
              {confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
