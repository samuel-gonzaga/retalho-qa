import { getCustomer, updateCustomer } from '@/server/customers'
import { handle, idParam, json, readBody, type RouteContext } from '@/server/http'

export const dynamic = 'force-dynamic'

export const GET = handle(async (_request: Request, context: RouteContext) => {
  return json({ customer: getCustomer(await idParam(context)) })
})

export const PUT = handle(async (request: Request, context: RouteContext) => {
  return json({ customer: updateCustomer(await idParam(context), await readBody(request)) })
})
