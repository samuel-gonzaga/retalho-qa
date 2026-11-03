import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchForm } from '@/components/search-form'
import { EmptyState, LinkButton, Notice, PageHeader } from '@/components/ui'
import { ACTION_LABELS } from '@/domain/labels'
import { listCustomers } from '@/server/customers'

export const metadata: Metadata = { title: 'Clientes' }

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; salvo?: string }>
}) {
  const { q = '', salvo } = await searchParams
  const query = q.trim()
  const customers = listCustomers(query)
  const registryIsEmpty = customers.length === 0 && (query === '' || listCustomers().length === 0)

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Pessoas físicas e jurídicas. O CEP decide se a entrega é própria (frete grátis com Pix)."
        actions={
          <LinkButton href="/clientes/novo" variant="primary">
            {ACTION_LABELS.newCustomer}
          </LinkButton>
        }
      />
      {salvo ? (
        <div className="mt-5">
          <Notice tone="success">Cliente {salvo} salvo.</Notice>
        </div>
      ) : null}

      <SearchForm
        action="/clientes"
        label="Buscar cliente"
        hint="Trecho do nome, com ou sem acento, ou dígitos do CPF ou CNPJ."
        defaultValue={query}
      />

      <div className="mt-6">
        {registryIsEmpty ? (
          <EmptyState title="Nenhum cliente cadastrado ainda.">
            Cadastre o primeiro cliente em “{ACTION_LABELS.newCustomer}”.
          </EmptyState>
        ) : customers.length === 0 ? (
          <EmptyState title={`Nenhum cliente encontrado para “${query}”.`}>
            Confira a grafia ou busque pelos dígitos do documento.
          </EmptyState>
        ) : (
          <>
            <p className="mb-2 text-sm text-tinta-suave" role="status">
              {customers.length} {customers.length === 1 ? 'cliente' : 'clientes'}
              {query ? ` para “${query}”` : ''}
            </p>
            <table className="tabela w-full border-y border-fio bg-papel">
              <caption className="sr-only">Clientes cadastrados</caption>
              <thead className="border-b border-fio text-left text-sm text-tinta-suave">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Documento
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    CEP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fio">
                {customers.map((customer) => (
                  <tr key={customer.id} className="max-sm:px-4">
                    <td data-label="" className="px-4 py-3">
                      <Link
                        href={`/clientes/${customer.id}`}
                        className="font-medium text-anil underline-offset-2 hover:underline"
                      >
                        {customer.name}
                      </Link>
                      <span className="block text-sm text-tinta-suave">
                        {customer.type === 'PF' ? 'Pessoa física' : 'Pessoa jurídica'}
                      </span>
                    </td>
                    <td
                      data-label={customer.type === 'PF' ? 'CPF' : 'CNPJ'}
                      className="px-4 py-3 font-mono text-sm"
                    >
                      {customer.documentFormatted}
                    </td>
                    <td data-label="CEP" className="px-4 py-3 font-mono text-sm">
                      {customer.cep}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  )
}
