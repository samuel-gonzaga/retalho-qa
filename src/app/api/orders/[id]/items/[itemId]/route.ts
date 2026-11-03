import { handle, idParam, json, readBody, type RouteContext } from '@/server/http'
import { removeItem, updateItem } from '@/server/orders'

export const dynamic = 'force-dynamic'

export const PATCH = handle(async (request: Request, context: RouteContext) => {
  const [id, itemId] = [await idParam(context), await idParam(context, 'itemId')]
  return json({ order: updateItem(id, itemId, await readBody(request)) })
})

export const DELETE = handle(async (_request: Request, context: RouteContext) => {
  const [id, itemId] = [await idParam(context), await idParam(context, 'itemId')]
  return json({ order: removeItem(id, itemId) })
})
