import { handle, json } from '@/server/http'
import { listInvoices } from '@/server/invoices'

export const dynamic = 'force-dynamic'

export const GET = handle(async () => json(listInvoices()))
