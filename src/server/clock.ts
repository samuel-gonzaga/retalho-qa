/**
 * Relógio substituível: o seed fixa as datas para gerar sempre a mesma massa (RNF-03).
 */
let clock: () => Date = () => new Date()

export function now(): string {
  return clock().toISOString()
}

export function setClock(next: () => Date): void {
  clock = next
}

export function resetClock(): void {
  clock = () => new Date()
}
