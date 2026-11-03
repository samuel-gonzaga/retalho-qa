import { handle, idParam, json, readBody, type RouteContext } from '@/server/http'
import { cancelInvoice } from '@/server/invoices'

export const dynamic = 'force-dynamic'

export const POST = handle(async (request: Request, context: RouteContext) => {
  return json(cancelInvoice(await idParam(context), await readBody(request)))
})
