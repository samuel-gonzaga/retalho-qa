import { createCustomer, listCustomers } from '@/server/customers'
import { handle, json, readBody } from '@/server/http'

export const dynamic = 'force-dynamic'

export const GET = handle(async (request: Request) => {
  const query = new URL(request.url).searchParams.get('q') ?? ''
  return json({ customers: listCustomers(query) })
})

export const POST = handle(async (request: Request) => {
  return json({ customer: createCustomer(await readBody(request)) }, 201)
})
