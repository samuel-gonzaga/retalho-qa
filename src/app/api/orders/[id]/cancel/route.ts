import { handle, idParam, json, readBody, type RouteContext } from '@/server/http'
import { cancelOrder } from '@/server/orders'

export const dynamic = 'force-dynamic'

export const POST = handle(async (request: Request, context: RouteContext) => {
  return json({ order: cancelOrder(await idParam(context), await readBody(request)) })
})
