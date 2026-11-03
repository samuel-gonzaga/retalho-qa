import { describe, expect, it } from 'vitest'
import { FIELD_MESSAGES as M } from '@/domain/messages'
import { api, DOCS, useFreshDatabase } from './helpers'

useFreshDatabase()

const pf = { type: 'PF', name: 'João Exemplo', document: DOCS.cpf1, cep: '12345678' }

describe('RF-06 a RF-09 · cadastrar cliente', () => {
  it('devolve 201 e grava documento e CEP normalizados', async () => {
    const res = await api('POST', '/api/customers', pf)
    expect(res.status).toBe(201)
    expect(res.body.customer).toMatchObject({
      type: 'PF',
      name: 'João Exemplo',
      document: '31415926590',
      cep: '12345-678',
    })
  })

  it('aceita PJ com CNPJ alfanumérico', async () => {
    const res = await api('POST', '/api/customers', {
      type: 'PJ',
      name: 'Ateliê Exemplo',
      document: DOCS.cnpj1,
      cep: '01000-000',
    })
    expect(res.status).toBe(201)
    expect(res.body.customer.document).toBe('12ABC34501DE35')
  })

  it.each([
    ['CPF com dígito verificador errado', { document: '314.159.265-91' }, 'document', M.cpf],
    ['CPF em cliente PJ', { type: 'PJ' }, 'document', M.cnpj],
    ['CEP fora do formato', { cep: '1234-567' }, 'cep', M.cep],
  ])('devolve 422 para %s', async (_, changes, field, message) => {
    const res = await api('POST', '/api/customers', { ...pf, ...changes })
    expect(res.status).toBe(422)
    expect(res.body.error.fields[field]).toBe(message)
  })
})

describe('RF-10 · documento único', () => {
  it('recusa o mesmo CPF com ou sem máscara', async () => {
    await api('POST', '/api/customers', pf)
    const res = await api('POST', '/api/customers', {
      ...pf,
      name: 'Outro Nome',
      document: '31415926590',
    })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('DUPLICATE_DOCUMENT')
  })
})

describe('RF-11 · editar e buscar clientes', () => {
  it('edita o cliente com as mesmas regras do cadastro', async () => {
    const { body } = await api('POST', '/api/customers', pf)
    const edited = await api('PUT', `/api/customers/${body.customer.id}`, {
      ...pf,
      cep: '20000000',
    })
    expect(edited.status).toBe(200)
    expect(edited.body.customer.cep).toBe('20000-000')
    const invalid = await api('PUT', `/api/customers/${body.customer.id}`, { ...pf, name: 'J' })
    expect(invalid.status).toBe(422)
  })

  it('busca por trecho do nome sem acento ou pelos dígitos do documento', async () => {
    await api('POST', '/api/customers', pf)
    await api('POST', '/api/customers', { ...pf, name: 'Maria Exemplo', document: DOCS.cpf2 })

    const byName = await api('GET', '/api/customers?q=joao')
    expect(byName.body.customers.map((c: { name: string }) => c.name)).toEqual(['João Exemplo'])
    const byDigits = await api('GET', '/api/customers?q=27182')
    expect(byDigits.body.customers.map((c: { name: string }) => c.name)).toEqual(['Maria Exemplo'])
    expect((await api('GET', '/api/customers?q=ninguem')).body.customers).toEqual([])
  })

  it('devolve 404 para cliente inexistente', async () => {
    expect((await api('GET', '/api/customers/999')).status).toBe(404)
  })
})
