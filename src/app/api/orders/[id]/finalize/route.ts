import { handle, idParam, json, type RouteContext } from '@/server/http'
import { finalizeOrder } from '@/server/orders'

export const dynamic = 'force-dynamic'

export const POST = handle(async (_request: Request, context: RouteContext) => {
  return json({ order: finalizeOrder(await idParam(context)) })
})
