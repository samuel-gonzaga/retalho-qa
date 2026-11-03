import { TextField } from './field'
import { buttonClass } from './ui'
import { ACTION_LABELS } from '@/domain/labels'

/** Busca por GET: o termo fica na URL e a página é recarregada com o resultado. */
export function SearchForm({
  action,
  label,
  hint,
  defaultValue,
}: {
  action: string
  label: string
  hint: string
  defaultValue: string
}) {
  return (
    <form role="search" action={action} className="mt-6 flex max-w-2xl items-start gap-3">
      <TextField
        id="q"
        type="search"
        label={label}
        hint={hint}
        defaultValue={defaultValue}
        className="min-w-0 flex-1"
      />
      <button type="submit" className={buttonClass('secondary', 'mt-7 shrink-0')}>
        {ACTION_LABELS.search}
      </button>
    </form>
  )
}
