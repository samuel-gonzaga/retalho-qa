import { describe, expect, it } from 'vitest'
import {
  formatCnpj,
  formatCpf,
  isValidCnpj,
  isValidCpf,
  normalizeCep,
  normalizeCnpj,
  normalizeCpf,
} from '@/domain/documents'

// Documentos fictícios: bases tiradas dos dígitos de π, e e φ, com dígitos verificadores
// calculados à parte pelo algoritmo público.

describe('RF-07 · validação de CPF', () => {
  it.each(['31415926590', '314.159.265-90', '271.828.182-05', ' 161.803.398-05 '])(
    'aceita %s',
    (cpf) => {
      expect(isValidCpf(cpf)).toBe(true)
    },
  )

  it.each([
    ['segundo dígito verificador alterado', '314.159.265-91'],
    ['primeiro dígito verificador alterado', '314.159.265-80'],
    ['11 dígitos iguais, com dígitos coerentes', '111.111.111-11'],
    ['10 dígitos', '3141592659'],
    ['12 dígitos', '314159265900'],
    ['máscara incompleta', '314.159.26590'],
    ['letra no lugar de dígito', '314.159.265-9A'],
    ['vazio', ''],
  ])('recusa: %s (%s)', (_, cpf) => {
    expect(isValidCpf(cpf)).toBe(false)
  })

  it('grava só os dígitos e exibe com máscara', () => {
    expect(normalizeCpf('314.159.265-90')).toBe('31415926590')
    expect(formatCpf('31415926590')).toBe('314.159.265-90')
  })
})

describe('RF-08 · validação de CNPJ numérico e alfanumérico', () => {
  it.each([
    '12.ABC.345/01DE-35',
    '12ABC34501DE35',
    '12.abc.345/01de-35',
    '31.415.926/0001-71',
    'RT.4LH.0QA/0001-22',
  ])('aceita %s', (cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(true)
  })

  it.each([
    ['dígito verificador alterado (alfanumérico)', '12.ABC.345/01DE-36'],
    ['dígito verificador alterado (numérico)', '31.415.926/0001-72'],
    ['14 caracteres iguais, com dígitos coerentes', '00.000.000/0000-00'],
    ['13 caracteres', '3141592600017'],
    ['15 caracteres', '314159260001710'],
    ['caractere fora de A–Z e 0–9', '12.AB$.345/01DE-35'],
    ['letra no dígito verificador', '12.ABC.345/01DE-3A'],
  ])('recusa: %s (%s)', (_, cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(false)
  })

  it('grava sem máscara, em maiúsculas, e exibe com máscara', () => {
    expect(normalizeCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35')
    expect(formatCnpj('12ABC34501DE35')).toBe('12.ABC.345/01DE-35')
  })
})

describe('RF-09 · validação de CEP', () => {
  it.each([
    ['12345678', '12345-678'],
    ['12345-678', '12345-678'],
    [' 01000-000 ', '01000-000'],
  ])('aceita %s e grava %s', (cep, expected) => {
    expect(normalizeCep(cep)).toBe(expected)
  })

  it.each(['1234-567', '123456789', '12345-67a', '12.345-678', ''])('recusa %s', (cep) => {
    expect(normalizeCep(cep)).toBeNull()
  })
})
