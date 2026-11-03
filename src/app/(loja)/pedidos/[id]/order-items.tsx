'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { callApi } from '@/components/api-client'
import { SelectField, TextField } from '@/components/field'
import { buttonClass, EmptyState, Notice } from '@/components/ui'
import { decimalToInput, formatQuantity, formatUnitPrice } from '@/domain/format'
import { ACTION_LABELS } from '@/domain/labels'
import { formatBRL } from '@/domain/money'
import { parseDecimalInput } from '@/domain/numbers'
import type { Unit } from '@/domain/units'

export type ItemView = {
  id: number
  code: string
  name: string
  unit: Unit
  quantity: number
  unitPriceCents: number
  totalCents: number
}

export type ProductOption = { id: number; code: string; name: string; unit: Unit; price: string }

const QUANTITY_HINTS: Record<Unit, string> = {
  meter: 'Em metros, com até 2 casas decimais (2,35).',
  roll: 'Número de rolos, sem frações.',
  unit: 'Número de unidades, sem frações.',
}

/** Uma linha de item em rascunho: a quantidade pode ser salva ou o item removido (RF-17). */
function EditableRow({ orderId, item }: { orderId: number; item: ItemView }) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(decimalToInput(item.quantity))
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  const inputId = `quantidade-item-${item.id}`

  async function run(request: () => ReturnType<typeof callApi>) {
    setPending(true)
    setError(undefined)
    const result = await request()
    setPending(false)
    if (result.ok) router.refresh()
    else setError(result.fields.quantity ?? result.message)
  }

  return (
    <tr className="max-sm:px-4">
      <td data-label="" className="px-4 py-3 align-top">
        <span className="font-medium">{item.name}</span>
        <span className="block font-mono text-sm text-tinta-suave">{item.code}</span>
      </td>
      <td data-label="Quantidade" className="px-4 py-3 align-top">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void run(() =>
              callApi('PATCH', `/api/orders/${orderId}/items/${item.id}`, {
                quantity: parseDecimalInput(quantity),
              }),
            )
          }}
          className="flex items-center justify-end gap-2 sm:justify-start"
        >
          <input
            id={inputId}
            aria-label={`Quantidade de ${item.name}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-erro` : undefined}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            className="numero min-h-11 w-24 rounded-[2px] border border-borda bg-papel px-2 text-right aria-invalid:border-carmim"
          />
          <span className="text-sm text-tinta-suave">
            {{ meter: 'm', roll: 'rolos', unit: 'un' }[item.unit]}
          </span>
          <button
            type="submit"
            disabled={pending}
            aria-label={`${ACTION_LABELS.save} quantidade de ${item.name}`}
            className={buttonClass('secondary', 'min-h-11 px-3 text-sm')}
          >
            {ACTION_LABELS.save}
          </button>
        </form>
        {error ? (
          <p id={`${inputId}-erro`} className="mt-1 text-sm font-medium text-carmim">
            {error}
          </p>
        ) : null}
      </td>
      <td data-label="Unitário" className="numero px-4 py-3 text-right align-top">
        {formatUnitPrice(item.unitPriceCents, item.unit)}
      </td>
      <td data-label="Total" className="numero px-4 py-3 text-right align-top font-medium">
        {formatBRL(item.totalCents)}
      </td>
      <td data-label="" className="px-4 py-3 text-right align-top">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void run(() => callApi('DELETE', `/api/orders/${orderId}/items/${item.id}`))
          }
          aria-label={`${ACTION_LABELS.removeItem} ${item.name}`}
          className="min-h-11 px-2 text-sm text-carmim underline-offset-2 hover:underline"
        >
          {ACTION_LABELS.removeItem}
        </button>
      </td>
    </tr>
  )
}

function ReadOnlyRow({ item }: { item: ItemView }) {
  return (
    <tr className="max-sm:px-4">
      <td data-label="" className="px-4 py-3">
        <span className="font-medium">{item.name}</span>
        <span className="block font-mono text-sm text-tinta-suave">{item.code}</span>
      </td>
      <td data-label="Quantidade" className="numero px-4 py-3 text-right sm:text-left">
        {formatQuantity(item.quantity, item.unit)}
      </td>
      <td data-label="Unitário" className="numero px-4 py-3 text-right">
        {formatUnitPrice(item.unitPriceCents, item.unit)}
      </td>
      <td data-label="Total" className="numero px-4 py-3 text-right font-medium">
        {formatBRL(item.totalCents)}
      </td>
    </tr>
  )
}

function AddItemForm({ orderId, products }: { orderId: number; products: ProductOption[] }) {
  const router = useRouter()
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [errors, setErrors] = useState<{ productId?: string; quantity?: string }>({})
  const [message, setMessage] = useState<string>()
  const [pending, setPending] = useState(false)
  const unit = products.find((product) => String(product.id) === productId)?.unit

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setErrors({})
    setMessage(undefined)
    const result = await callApi('POST', `/api/orders/${orderId}/items`, {
      productId: productId ? Number(productId) : null,
      quantity: parseDecimalInput(quantity),
    })
    setPending(false)
    if (result.ok) {
      setProductId('')
      setQuantity('')
      router.refresh()
      return
    }
    setErrors(result.fields)
    if (Object.keys(result.fields).length === 0) setMessage(result.message)
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-3">
      {message ? <Notice tone="error">{message}</Notice> : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-start">
        <SelectField
          id="novo-item-produto"
          label="Produto"
          error={errors.productId}
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
        >
          <option value="">Escolha um produto</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.code} · {product.name} · {product.price}
            </option>
          ))}
        </SelectField>
        <TextField
          id="novo-item-quantidade"
          label="Quantidade"
          hint={unit ? QUANTITY_HINTS[unit] : 'De 0,01 a 1.000.'}
          error={errors.quantity}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          className="[&_input]:numero"
        />
        <button type="submit" disabled={pending} className={buttonClass('secondary', 'sm:mt-7')}>
          {ACTION_LABELS.addItem}
        </button>
      </div>
    </form>
  )
}

export function OrderItems({
  orderId,
  editable,
  items,
  products,
}: {
  orderId: number
  editable: boolean
  items: ItemView[]
  products: ProductOption[]
}) {
  return (
    <>
      {items.length === 0 ? (
        <EmptyState title="Nenhum item ainda.">
          Escolha um produto e a quantidade abaixo e use “{ACTION_LABELS.addItem}”.
        </EmptyState>
      ) : (
        <table className="tabela w-full border-y border-fio bg-papel">
          <caption className="sr-only">Itens do pedido</caption>
          <thead className="border-b border-fio text-left text-sm text-tinta-suave">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                Produto
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Quantidade
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Unitário
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Total
              </th>
              {editable ? (
                <th scope="col" className="px-4 py-2 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-fio">
            {items.map((item) =>
              editable ? (
                // A chave muda com a quantidade gravada, para o campo voltar ao valor salvo.
                <EditableRow key={`${item.id}-${item.quantity}`} orderId={orderId} item={item} />
              ) : (
                <ReadOnlyRow key={item.id} item={item} />
              ),
            )}
          </tbody>
        </table>
      )}
      {editable ? <AddItemForm orderId={orderId} products={products} /> : null}
    </>
  )
}
