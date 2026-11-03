import { handle, json, readBody } from '@/server/http'
import { createOrder, listOrders } from '@/server/orders'

export const dynamic = 'force-dynamic'

export const GET = handle(async (request: Request) => {
  const status = new URL(request.url).searchParams.get('status')
  return json({ orders: listOrders(status) })
})

export const POST = handle(async (request: Request) => {
  return json({ order: createOrder(await readBody(request)) }, 201)
})
