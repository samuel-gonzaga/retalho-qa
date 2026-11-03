/**
 * Campos de formulário com rótulo visível, dica e erro ligados por aria-describedby (RNF-05).
 */
import type { ComponentProps, ReactNode } from 'react'

const CONTROL =
  'block w-full min-h-11 rounded-[2px] border border-borda bg-papel px-3 py-2 text-tinta ' +
  'transition-colors duration-150 hover:border-tinta aria-invalid:border-carmim ' +
  'disabled:bg-fundo disabled:text-tinta-suave'

type FieldProps = {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: string
  className?: string
}

function describedBy(id: string, hint?: ReactNode, error?: string): string | undefined {
  const ids = [hint ? `${id}-dica` : null, error ? `${id}-erro` : null].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

function FieldShell({
  id,
  label,
  hint,
  error,
  className = '',
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-dica`} className="mt-1 text-sm text-tinta-suave">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-erro`} className="mt-1 text-sm font-medium text-carmim">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextField({
  id,
  label,
  hint,
  error,
  className,
  ...input
}: FieldProps & Omit<ComponentProps<'input'>, 'id'>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={CONTROL}
        {...input}
      />
    </FieldShell>
  )
}

export function SelectField({
  id,
  label,
  hint,
  error,
  className,
  children,
  ...select
}: FieldProps & Omit<ComponentProps<'select'>, 'id'>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <select
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={CONTROL}
        {...select}
      >
        {children}
      </select>
    </FieldShell>
  )
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  className,
  ...textarea
}: FieldProps & Omit<ComponentProps<'textarea'>, 'id'>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={CONTROL}
        {...textarea}
      />
    </FieldShell>
  )
}

/** Grupo de opções exclusivas (fieldset + legend) para escolhas curtas como PF/PJ e unidade. */
export function RadioGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  disabled,
}: {
  name: string
  legend: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  error?: string
  disabled?: boolean
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-erro` : undefined}>
      <legend className="mb-1 font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[2px] border border-borda bg-papel px-3 has-checked:border-anil has-checked:bg-anil/5 has-disabled:cursor-not-allowed"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              className="accent-anil"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${name}-erro`} className="mt-1 text-sm font-medium text-carmim">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
