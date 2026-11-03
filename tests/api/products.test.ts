import { describe, expect, it } from 'vitest'
import { addItem, api, createOrder, createProduct, withFreshDatabase } from './helpers'

withFreshDatabase()

const linho = { code: 'TEC1001', name: 'Linho Misto', unit: 'meter', priceCents: 4990 }

describe('RF-01 · cadastrar produto', () => {
  it('devolve 201 com o produto criado e o produto pode ser lido', async () => {
    const created = await api('POST', '/api/products', linho)
    expect(created.status).toBe(201)
    expect(created.body.product).toMatchObject({ ...linho, rollLength: null })

    const read = await api('GET', `/api/products/${created.body.product.id}`)
    expect(read.status).toBe(200)
    expect(read.body.product.code).toBe('TEC1001')
  })

  it('RF-05 · devolve o preço do rolo junto do produto vendido em rolo', async () => {
    const res = await api('POST', '/api/products', {
      code: 'ROL2001',
      name: 'Entretela',
      unit: 'roll',
      priceCents: 400,
      rollLength: 5,
    })
    expect(res.status).toBe(201)
    expect(res.body.product).toMatchObject({ rollLength: 5, rollPriceCents: 2000 })
  })

  it('devolve 422 com a mensagem de cada campo inválido e não grava nada', async () => {
    const res = await api('POST', '/api/products', { code: 'x', unit: 'kg', priceCents: 0 })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'code',
      'name',
      'priceCents',
      'unit',
    ])
    expect((await api('GET', '/api/products')).body.products).toHaveLength(0)
  })

  it('RNF-11 · devolve 400 quando o corpo não é JSON', async () => {
    const res = await api('POST', '/api/products', undefined, { raw: 'abc' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_JSON')
  })
})

describe('RF-02 · código de produto único', () => {
  it('recusa código repetido no cadastro e na edição', async () => {
    await api('POST', '/api/products', linho)
    const duplicate = await api('POST', '/api/products', { ...linho, name: 'Outro' })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.code).toBe('DUPLICATE_PRODUCT_CODE')

    const other = await createProduct({ code: 'TEC1002' })
    const edit = await api('PUT', `/api/products/${other.id}`, { ...linho, name: 'Outro' })
    expect(edit.status).toBe(409)
  })
})

describe('RF-03 · editar produto', () => {
  it('não altera o item já lançado; o item incluído depois usa o preço novo', async () => {
    const product = await createProduct({ code: 'AVI3001', priceCents: 150 })
    const order = await createOrder()
    await addItem(order.id, product.id, 2)

    const edited = await api('PUT', `/api/products/${product.id}`, {
      code: 'AVI3001',
      name: product.name,
      unit: 'unit',
      priceCents: 200,
    })
    expect(edited.status).toBe(200)
    const unchanged = await api('GET', `/api/orders/${order.id}`)
    expect(unchanged.body.order.items[0]).toMatchObject({ priceCents: 150, totalCents: 300 })

    const second = await createOrder()
    const added = await addItem(second.id, product.id, 2)
    expect(added.body.order.items[0]).toMatchObject({ priceCents: 200, totalCents: 400 })
  })

  it('devolve 404 para produto inexistente', async () => {
    expect((await api('GET', '/api/products/999')).status).toBe(404)
    expect((await api('GET', '/api/products/abc')).status).toBe(404)
    const edit = await api('PUT', '/api/products/999', linho)
    expect(edit.status).toBe(404)
    expect(edit.body.error.code).toBe('NOT_FOUND')
  })
})

describe('RF-04 · buscar produtos', () => {
  async function search(q: string) {
    const res = await api('GET', `/api/products?q=${encodeURIComponent(q)}`)
    return res.body.products.map((p: { name: string }) => p.name)
  }

  it('busca por nome ou código, sem diferenciar maiúsculas, minúsculas e acentos', async () => {
    await api('POST', '/api/products', linho)
    await createProduct({ code: 'TEC1002', name: 'Algodão Cru', unit: 'meter' })
    await createProduct({ code: 'AVI3001', name: 'Botão de Madeira' })

    expect(await search('linho')).toEqual(['Linho Misto'])
    expect(await search('algodao')).toEqual(['Algodão Cru'])
    expect(await search('tec10')).toEqual(['Algodão Cru', 'Linho Misto'])
    expect(await search('')).toEqual(['Algodão Cru', 'Botão de Madeira', 'Linho Misto'])
    expect(await search('veludo')).toEqual([])
  })
})
