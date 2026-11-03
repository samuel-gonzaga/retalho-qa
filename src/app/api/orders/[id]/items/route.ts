import { handle, idParam, json, readBody, type RouteContext } from '@/server/http'
import { addItem } from '@/server/orders'

export const dynamic = 'force-dynamic'

export const POST = handle(async (request: Request, context: RouteContext) => {
  return json({ order: addItem(await idParam(context), await readBody(request)) }, 201)
})
