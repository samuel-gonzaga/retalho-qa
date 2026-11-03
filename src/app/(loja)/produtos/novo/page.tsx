import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui'
import { ACTION_LABELS } from '@/domain/labels'
import { ProductForm } from '../product-form'

export const metadata: Metadata = { title: ACTION_LABELS.newProduct }

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        eyebrow="Produtos"
        title={ACTION_LABELS.newProduct}
        description="Para rolos, o preço é por metro e o preço do rolo é calculado pelo comprimento."
      />
      <ProductForm />
    </>
  )
}
