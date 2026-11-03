import { getDashboard } from '@/server/dashboard'
import { handle, json } from '@/server/http'

export const dynamic = 'force-dynamic'

export const GET = handle(async () => json(getDashboard()))
