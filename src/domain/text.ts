/**
 * Chave de busca sem diferença de maiúsculas, minúsculas e acentos (RF-04, RF-11).
 */
export function searchKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
