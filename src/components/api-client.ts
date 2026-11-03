/**
 * Chamadas à API REST a partir do navegador. Devolve a mensagem em português do servidor e os
 * erros por campo, nunca o código técnico (RNF-08).
 */
export type FieldErrors = Record<string, string>

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string; fields: FieldErrors }

const NETWORK_MESSAGE =
  'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.'

export async function callApi<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string; fields?: FieldErrors }
    } | null
    if (response.ok) return { ok: true, data: payload as T }
    return {
      ok: false,
      status: response.status,
      message: payload?.error?.message ?? NETWORK_MESSAGE,
      fields: payload?.error?.fields ?? {},
    }
  } catch {
    return { ok: false, status: 0, message: NETWORK_MESSAGE, fields: {} }
  }
}
