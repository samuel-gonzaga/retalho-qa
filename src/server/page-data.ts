import { notFound } from 'next/navigation'
import { ApiError } from './errors'

/** Nas páginas, um recurso inexistente vira a tela 404 em vez de um erro. */
export function findOrNotFound<T>(load: () => T): T {
  try {
    return load()
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') notFound()
    throw error
  }
}
