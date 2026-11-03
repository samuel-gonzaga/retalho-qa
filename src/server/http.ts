/**
 * Utilidades das rotas: leitura do corpo, parâmetros e formato de erro (RNF-11).
 */
import { NextResponse } from 'next/server'
import { ERROR_MESSAGES as E } from '@/domain/messages'
import { ApiError } from './errors'

export type RouteContext = { params: Promise<Record<string, string>> }

const INVALID_BODY = Symbol('invalid-body')

/** Lê o corpo sem falhar: um JSON inválido só vira erro quando o serviço exige o corpo. */
export async function readBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (text.trim() === '') return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return INVALID_BODY
  }
}

/** RF-31: chamado depois de verificar recurso e estado, para que 404 e 409 venham antes do 400. */
export function requireJson(body: unknown): unknown {
  if (body === INVALID_BODY) throw new ApiError('INVALID_JSON', E.invalidJson)
  return body
}

/** ID numérico da rota; qualquer outro valor equivale a um recurso inexistente. */
export async function idParam(context: RouteContext, name = 'id'): Promise<number | null> {
  const raw = (await context.params)[name] ?? ''
  if (!/^\d{1,15}$/.test(raw)) return null
  const id = Number(raw)
  return id > 0 ? id : null
}

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const { code, message, fields } = error
    return json({ error: { code, message, ...(fields ? { fields } : {}) } }, error.status)
  }
  console.error(error)
  return json({ error: { code: 'INTERNAL_ERROR', message: E.unexpected } }, 500)
}

/** Envolve um handler de rota e converte qualquer erro no formato da API. */
export function handle<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response> | Response,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args)
    } catch (error) {
      return errorResponse(error)
    }
  }
}
