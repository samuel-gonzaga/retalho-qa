import { describe, expect, it } from 'vitest'
import { FIELD_MESSAGES as M } from '@/domain/messages'
import {
  validateAmountCents,
  validateCustomerInput,
  validateOrderHeader,
  validateProductInput,
  validateReason,
} from '@/domain/validation'

function fieldsOf(result: { ok: boolean; fields?: Record<string, string> }) {
  return result.ok ? {} : (result.fields ?? {})
}

const meterProduct = { code: 'TEC1001', name: 'Linho Misto', unit: 'meter', priceCents: 4990 }
const rollProduct = {
  code: 'ROL2001',
  name: 'Entretela',
  unit: 'roll',
  priceCents: 400,
  rollLength: 5,
}

describe('RF-01 · validação do produto', () => {
  it('aceita produto por metro e tira espaços das pontas do nome', () => {
    const result = validateProductInput({ ...meterProduct, name: '  Linho Misto  ' })
    expect(result).toEqual({
      ok: true,
      value: { ...meterProduct, name: 'Linho Misto', rollLengthCenti: null },
    })
  })

  it('aceita rolo com comprimento e guarda o comprimento em centésimos', () => {
    const result = validateProductInput(rollProduct)
    expect(result.ok && result.value.rollLengthCenti).toBe(500)
  })

  it.each([
    ['ABC', true],
    ['ABCDEF123456', true],
    ['AB', false],
    ['ABCDEF1234567', false],
    ['tec1001', false],
    ['TEC-1001', false],
  ])('código %s: válido = %s', (code, valid) => {
    expect(fieldsOf(validateProductInput({ ...meterProduct, code })).code).toBe(
      valid ? undefined : M.productCode,
    )
  })

  it.each([
    ['A', false],
    ['Li', true],
    ['x'.repeat(80), true],
    ['x'.repeat(81), false],
    ['     ', false],
  ])('nome "%s": válido = %s', (name, valid) => {
    expect(fieldsOf(validateProductInput({ ...meterProduct, name })).name).toBe(
      valid ? undefined : M.productName,
    )
  })

  it.each([
    [0, false],
    [1, true],
    [9_999_999, true],
    [10_000_000, false],
    [1.5, false],
    ['100', false],
  ])('preço de %s centavos: válido = %s', (priceCents, valid) => {
    expect(fieldsOf(validateProductInput({ ...meterProduct, priceCents })).priceCents).toBe(
      valid ? undefined : M.productPrice,
    )
  })

  it('recusa unidade fora da lista', () => {
    expect(fieldsOf(validateProductInput({ ...meterProduct, unit: 'kg' })).unit).toBe(M.productUnit)
  })

  it.each([
    [undefined, false],
    [0, false],
    [0.01, true],
    [500, true],
    [500.01, false],
    [2.555, false],
  ])('rolo com comprimento %s: válido = %s', (rollLength, valid) => {
    expect(fieldsOf(validateProductInput({ ...rollProduct, rollLength })).rollLength).toBe(
      valid ? undefined : M.rollLength,
    )
  })

  it('recusa comprimento em produto que não é rolo', () => {
    expect(fieldsOf(validateProductInput({ ...meterProduct, rollLength: 5 })).rollLength).toBe(
      M.rollLengthNotApplicable,
    )
  })

  it('aponta todos os campos obrigatórios quando o corpo não é um objeto', () => {
    expect(Object.keys(fieldsOf(validateProductInput(null))).sort()).toEqual([
      'code',
      'name',
      'priceCents',
      'unit',
    ])
  })
})

describe('RF-06 a RF-09 · validação do cliente', () => {
  const pf = { type: 'PF', name: 'Cliente Exemplo', document: '314.159.265-90', cep: '12345678' }
  const pj = {
    type: 'PJ',
    name: 'Ateliê Exemplo',
    document: '12.ABC.345/01DE-35',
    cep: '01000-000',
  }

  it('aceita PF e grava documento e CEP normalizados', () => {
    expect(validateCustomerInput(pf)).toEqual({
      ok: true,
      value: { type: 'PF', name: 'Cliente Exemplo', document: '31415926590', cep: '12345-678' },
    })
  })

  it('aceita PJ com CNPJ alfanumérico', () => {
    expect(validateCustomerInput(pj).ok).toBe(true)
  })

  it('recusa CPF em cliente PJ e CNPJ em cliente PF', () => {
    expect(fieldsOf(validateCustomerInput({ ...pj, document: pf.document })).document).toBe(M.cnpj)
    expect(fieldsOf(validateCustomerInput({ ...pf, document: pj.document })).document).toBe(M.cpf)
  })

  it.each([
    ['A', false],
    ['x'.repeat(120), true],
    ['x'.repeat(121), false],
  ])('nome com %s: válido = %s', (name, valid) => {
    expect(fieldsOf(validateCustomerInput({ ...pf, name })).name).toBe(
      valid ? undefined : M.customerName,
    )
  })

  it('recusa tipo fora da lista e CEP fora do formato', () => {
    const fields = fieldsOf(validateCustomerInput({ ...pf, type: 'XX', cep: '1234-567' }))
    expect(fields.type).toBe(M.customerType)
    expect(fields.cep).toBe(M.cep)
  })
})

describe('RF-18, RF-19, RF-22 · validação do cabeçalho do pedido', () => {
  const header = {
    customerId: 1,
    discountPct: 10,
    freightCents: 5000,
    paymentMethod: 'pix',
    installments: 3,
  }

  it.each([
    [-1, null],
    [0, 0],
    [12.5, 1250],
    [12.345, null],
    [100, 10_000],
    [101, null],
  ])('desconto de %d %%: centésimos = %s', (discountPct, expected) => {
    const result = validateOrderHeader({ ...header, discountPct })
    if (expected === null) expect(fieldsOf(result).discountPct).toBe(M.discount)
    else expect(result.ok && result.value.discountBp).toBe(expected)
  })

  it.each([
    [-1, false],
    [0, true],
    [999_999, true],
    [1_000_000, false],
    [10.5, false],
  ])('frete de %d centavos: válido = %s', (freightCents, valid) => {
    expect(fieldsOf(validateOrderHeader({ ...header, freightCents })).freightCents).toBe(
      valid ? undefined : M.freight,
    )
  })

  it.each([
    [0, false],
    [1, true],
    [3, true],
    [4, false],
    [1.5, false],
  ])('%d parcela(s): válido = %s', (installments, valid) => {
    expect(fieldsOf(validateOrderHeader({ ...header, installments })).installments).toBe(
      valid ? undefined : M.installments,
    )
  })

  it.each([
    ['pix', true],
    ['boleto', true],
    ['card', true],
    ['cheque', false],
  ])('forma de pagamento %s: válida = %s', (paymentMethod, valid) => {
    expect(fieldsOf(validateOrderHeader({ ...header, paymentMethod })).paymentMethod).toBe(
      valid ? undefined : M.paymentMethod,
    )
  })

  it('recusa cliente que não é um ID inteiro positivo', () => {
    expect(fieldsOf(validateOrderHeader({ ...header, customerId: 'abc' })).customerId).toBe(
      M.customer,
    )
  })
})

describe('RF-29, RF-34 · motivo do cancelamento', () => {
  it.each([
    ['9 caracteres', 'x'.repeat(9), null],
    ['10 caracteres', 'x'.repeat(10), 'x'.repeat(10)],
    ['200 caracteres', 'x'.repeat(200), 'x'.repeat(200)],
    ['201 caracteres', 'x'.repeat(201), null],
    ['só espaços', ' '.repeat(12), null],
    ['10 caracteres com espaços nas pontas', '  Sem estoque  ', 'Sem estoque'],
    ['não é texto', 12345678901, null],
  ])('%s → %s', (_, reason, expected) => {
    expect(validateReason(reason)).toBe(expected)
  })
})

describe('RF-32 · valor da nota', () => {
  it.each([
    [1, true],
    [0, false],
    [-100, false],
    [1.5, false],
    ['100', false],
  ])('%s centavos: válido = %s', (amount, valid) => {
    expect(validateAmountCents(amount)).toBe(valid ? amount : null)
  })
})
