import { handle, idParam, json, readBody, type RouteContext } from '@/server/http'
import { getProduct, updateProduct } from '@/server/products'

export const dynamic = 'force-dynamic'

export const GET = handle(async (_request: Request, context: RouteContext) => {
  return json({ product: getProduct(await idParam(context)) })
})

export const PUT = handle(async (request: Request, context: RouteContext) => {
  return json({ product: updateProduct(await idParam(context), await readBody(request)) })
})
