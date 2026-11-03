import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetBugOverrides } from '@/domain/bugs'
import { api, type Json } from './helpers'

afterEach(() => {
  vi.unstubAllEnvs()
  resetBugOverrides()
})

function activeIds(body: Json): number[] {
  const bugs = body.bugs as { id: number; active: boolean }[]
  return bugs.filter((bug) => bug.active).map((bug) => bug.id)
}

describe('RNF-01 · API da área de QA', () => {
  it('lista os 7 defeitos, liga exatamente os enviados e volta ao RETALHO_BUGS', async () => {
    vi.stubEnv('RETALHO_BUGS', '')
    const list = await api('GET', '/api/qa/bugs')
    expect(list.status).toBe(200)
    expect(list.body.bugs).toHaveLength(7)

    const set = await api('PUT', '/api/qa/bugs', { active: [2, 5] })
    expect(activeIds(set.body)).toEqual([2, 5])

    const reset = await api('DELETE', '/api/qa/bugs')
    expect(activeIds(reset.body)).toEqual([])
  })

  it('recusa defeito inexistente com 422', async () => {
    const res = await api('PUT', '/api/qa/bugs', { active: [9] })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('RNF-11 · recusa corpo que não é JSON com 400', async () => {
    const res = await api('PUT', '/api/qa/bugs', undefined, { raw: 'ligar tudo' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_JSON')
  })

  it('fica indisponível em produção sem RETALHO_QA_PAINEL=1', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RETALHO_QA_PAINEL', '')
    expect((await api('GET', '/api/qa/bugs')).status).toBe(404)
    expect((await api('PUT', '/api/qa/bugs', { active: [1] })).status).toBe(404)
  })
})
