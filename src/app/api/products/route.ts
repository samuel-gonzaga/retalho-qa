import { handle, json, readBody } from '@/server/http'
import { createProduct, listProducts } from '@/server/products'

export const dynamic = 'force-dynamic'

export const GET = handle(async (request: Request) => {
  const query = new URL(request.url).searchParams.get('q') ?? ''
  return json({ products: listProducts(query) })
})

export const POST = handle(async (request: Request) => {
  return json({ product: createProduct(await readBody(request)) }, 201)
})
