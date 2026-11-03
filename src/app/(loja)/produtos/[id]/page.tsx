import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui'
import { findOrNotFound } from '@/server/page-data'
import { getProduct } from '@/server/products'
import { ProductForm } from '../product-form'

export const metadata: Metadata = { title: 'Produto' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = findOrNotFound(() => getProduct(/^\d+$/.test(id) ? Number(id) : null))
  return (
    <>
      <PageHeader
        eyebrow="Produtos"
        title={product.name}
        description="Mudar o preço não altera itens já lançados em pedidos."
      />
      <ProductForm product={product} />
    </>
  )
}
