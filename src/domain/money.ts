/**
 * Dinheiro em centavos inteiros e arredondamento meio para cima (SPEC 1.2).
 * Nenhum cálculo de valor usa ponto flutuante.
 */

/** Divide inteiros não negativos e arredonda meio para cima: 8325 ÷ 10 = 833. */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || numerator < 0) {
    throw new RangeError(`Numerador inválido: ${numerator}`)
  }
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new RangeError(`Denominador inválido: ${denominator}`)
  }
  let quotient = Math.floor(numerator / denominator)
  let remainder = numerator - quotient * denominator
  // Corrige o quociente se a divisão em ponto flutuante errou por um.
  if (remainder < 0) {
    quotient -= 1
    remainder += denominator
  } else if (remainder >= denominator) {
    quotient += 1
    remainder -= denominator
  }
  return remainder * 2 >= denominator ? quotient + 1 : quotient
}

/** Formata centavos como `R$ 1.234,56`. */
export function formatBRL(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  const reais = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const centavos = (absolute % 100).toString().padStart(2, '0')
  return `${sign}R$ ${reais},${centavos}`
}
