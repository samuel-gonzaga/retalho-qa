/**
 * Números decimais com até 2 casas, guardados como inteiros em centésimos.
 */

const PLAIN_DECIMAL = /^\d+(?:\.(\d+))?$/

/** Casas decimais de um número não negativo, ou null se ele não estiver em notação simples. */
export function decimalPlaces(value: number): number | null {
  const match = PLAIN_DECIMAL.exec(String(value))
  if (!match) return null
  return match[1]?.length ?? 0
}

/** Converte um número com até 2 casas decimais para centésimos inteiros (2,35 → 235). */
export function toHundredths(value: number): number | null {
  const places = decimalPlaces(value)
  if (places === null || places > 2) return null
  const [whole = '0', fraction = ''] = String(value).split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

/** Converte centésimos para número (235 → 2,35). */
export function fromHundredths(hundredths: number): number {
  return hundredths / 100
}

/** Lê o texto de um campo numérico: aceita vírgula ou ponto decimal, sem separador de milhar. */
export function parseDecimalInput(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(trimmed)) return null
  return Number(trimmed.replace(',', '.'))
}
