/** Padrão LIKE que encontra `term` em qualquer posição, com % e _ tratados como texto. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

export const LIKE_ESCAPE = "ESCAPE '\\'"
