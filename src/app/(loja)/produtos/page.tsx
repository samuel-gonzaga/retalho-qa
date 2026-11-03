import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchForm } from '@/components/search-form'
import { EmptyState, LinkButton, Notice, PageHeader } from '@/components/ui'
import { formatDecimal, formatProductPrice, formatUnitPrice } from '@/domain/format'
import { ACTION_LABELS } from '@/domain/labels'
import { listProducts, type Product } from '@/server/products'

export const metadata: Metadata = { title: 'Produtos' }

/** Para rolos, mostra também o preço por metro de que o preço do rolo é calculado (RF-05). */
function unitDescription(product: Product): string {
  if (product.unit === 'roll') {
    return `rolo de ${formatDecimal(product.rollLength ?? 0)} m a ${formatUnitPrice(product.priceCents, 'meter')}`
  }
  return product.unit === 'meter' ? 'metro' : 'unidade'
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; salvo?: string }>
}) {
  const { q = '', salvo } = await searchParams
  const query = q.trim()
  const products = listProducts(query)
  const catalogIsEmpty = products.length === 0 && (query === '' || listProducts().length === 0)

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Tecidos vendidos por metro, rolos de comprimento fixo e aviamentos por unidade."
        actions={
          <LinkButton href="/produtos/novo" variant="primary">
            {ACTION_LABELS.newProduct}
          </LinkButton>
        }
      />
      {salvo ? (
        <div className="mt-5">
          <Notice tone="success">Produto {salvo} salvo.</Notice>
        </div>
      ) : null}

      <SearchForm
        action="/produtos"
        label="Buscar produto"
        hint="Trecho do nome ou do código, com ou sem acento."
        defaultValue={query}
      />

      <div className="mt-6">
        {catalogIsEmpty ? (
          <EmptyState title="Nenhum produto cadastrado ainda.">
            Cadastre o primeiro tecido, rolo ou aviamento em “{ACTION_LABELS.newProduct}”.
          </EmptyState>
        ) : products.length === 0 ? (
          <EmptyState title={`Nenhum produto encontrado para “${query}”.`}>
            Confira a grafia ou cadastre um novo produto.
          </EmptyState>
        ) : (
          <>
            <p className="mb-2 text-sm text-tinta-suave" role="status">
              {products.length} {products.length === 1 ? 'produto' : 'produtos'}
              {query ? ` para “${query}”` : ''}
            </p>
            <table className="tabela w-full border-y border-fio bg-papel">
              <caption className="sr-only">Produtos cadastrados</caption>
              <thead className="border-b border-fio text-left text-sm text-tinta-suave">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Produto
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Unidade
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Preço
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fio">
                {products.map((product) => (
                  <tr key={product.id} className="max-sm:px-4">
                    <td data-label="" className="px-4 py-3">
                      <Link
                        href={`/produtos/${product.id}`}
                        className="font-medium text-anil underline-offset-2 hover:underline"
                      >
                        {product.name}
                      </Link>
                      <span className="block font-mono text-sm text-tinta-suave">
                        {product.code}
                      </span>
                    </td>
                    <td data-label="Unidade" className="px-4 py-3 text-tinta-suave">
                      {unitDescription(product)}
                    </td>
                    <td data-label="Preço" className="numero px-4 py-3 text-right">
                      {formatProductPrice(product)}
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
