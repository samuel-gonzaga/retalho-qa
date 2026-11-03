import { handle, idParam, json, readBody, type RouteContext } from '@/server/http'
import { getOrder, updateOrderHeader } from '@/server/orders'

export const dynamic = 'force-dynamic'

export const GET = handle(async (_request: Request, context: RouteContext) => {
  return json({ order: getOrder(await idParam(context)) })
})

export const PUT = handle(async (request: Request, context: RouteContext) => {
  return json({ order: updateOrderHeader(await idParam(context), await readBody(request)) })
})
