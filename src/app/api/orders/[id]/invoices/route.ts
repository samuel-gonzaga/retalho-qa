import { handle, idParam, json, readBody, type RouteContext } from '@/server/http'
import { issueInvoice } from '@/server/invoices'

export const dynamic = 'force-dynamic'

export const POST = handle(async (request: Request, context: RouteContext) => {
  return json(issueInvoice(await idParam(context), await readBody(request)), 201)
})
