/**
 * CPF, CNPJ (numérico e alfanumérico) e CEP (RF-07, RF-08, RF-09).
 */

const CPF_PLAIN = /^\d{11}$/
const CPF_MASKED = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/
const CNPJ_PLAIN = /^[A-Z0-9]{12}\d{2}$/
const CNPJ_MASKED = /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/
const CEP = /^(\d{5})-?(\d{3})$/

/** Dígito verificador de módulo 11: resto menor que 2 vale 0; senão, 11 − resto. */
function mod11Digit(sum: number): number {
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

function weightedSum(values: number[], weights: number[]): number {
  return values.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0)
}

export function normalizeCpf(input: string): string | null {
  const trimmed = input.trim()
  if (CPF_PLAIN.test(trimmed)) return trimmed
  if (CPF_MASKED.test(trimmed)) return trimmed.replace(/\D/g, '')
  return null
}

/** Os dois dígitos verificadores de uma base de 9 dígitos (pesos 10 a 2 e 11 a 2). */
export function cpfCheckDigits(base: string): string {
  const digits = [...base].map(Number)
  const first = mod11Digit(weightedSum(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]))
  const second = mod11Digit(weightedSum([...digits, first], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]))
  return `${first}${second}`
}

export function isValidCpf(input: string): boolean {
  const cpf = normalizeCpf(input)
  if (!cpf || /^(\d)\1{10}$/.test(cpf)) return false
  return cpf.slice(9) === cpfCheckDigits(cpf.slice(0, 9))
}

export function formatCpf(cpf: string): string {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

export function normalizeCnpj(input: string): string | null {
  const trimmed = input.trim().toUpperCase()
  if (CNPJ_PLAIN.test(trimmed)) return trimmed
  if (CNPJ_MASKED.test(trimmed)) return trimmed.replace(/[./-]/g, '')
  return null
}

const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const CNPJ_WEIGHTS_2 = [6, ...CNPJ_WEIGHTS_1]

/** Dígitos verificadores de uma base de 12 caracteres: cada um vale o código ASCII − 48. */
export function cnpjCheckDigits(base: string): string {
  const values = [...base].map((char) => char.charCodeAt(0) - 48)
  const first = mod11Digit(weightedSum(values, CNPJ_WEIGHTS_1))
  const second = mod11Digit(weightedSum([...values, first], CNPJ_WEIGHTS_2))
  return `${first}${second}`
}

export function isValidCnpj(input: string): boolean {
  const cnpj = normalizeCnpj(input)
  if (!cnpj || /^(.)\1{13}$/.test(cnpj)) return false
  return cnpj.slice(12) === cnpjCheckDigits(cnpj.slice(0, 12))
}

export function formatCnpj(cnpj: string): string {
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

/** CEP com ou sem hífen, gravado como 00000-000. */
export function normalizeCep(input: string): string | null {
  const match = CEP.exec(input.trim())
  return match ? `${match[1]}-${match[2]}` : null
}
