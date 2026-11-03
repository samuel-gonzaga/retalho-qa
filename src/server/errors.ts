/**
 * Erros da API com os códigos e mensagens da seção 11 da especificação.
 */
import { ERROR_MESSAGES as E, type Entity } from '@/domain/messages'
import type { FieldErrors, Validation } from '@/domain/validation'

export type ErrorCode =
  | 'INVALID_JSON'
  | 'NOT_FOUND'
  | 'DUPLICATE_PRODUCT_CODE'
  | 'DUPLICATE_DOCUMENT'
  | 'DUPLICATE_ITEM'
  | 'ORDER_NOT_EDITABLE'
  | 'INVALID_TRANSITION'
  | 'VALIDATION_ERROR'
  | 'ORDER_INCOMPLETE'
  | 'REASON_REQUIRED'
  | 'AMOUNT_EXCEEDS_BALANCE'

const HTTP_STATUS: Record<ErrorCode, number> = {
  INVALID_JSON: 400,
  NOT_FOUND: 404,
  DUPLICATE_PRODUCT_CODE: 409,
  DUPLICATE_DOCUMENT: 409,
  DUPLICATE_ITEM: 409,
  ORDER_NOT_EDITABLE: 409,
  INVALID_TRANSITION: 409,
  VALIDATION_ERROR: 422,
  ORDER_INCOMPLETE: 422,
  REASON_REQUIRED: 422,
  AMOUNT_EXCEEDS_BALANCE: 422,
}

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly fields: FieldErrors | undefined

  constructor(code: ErrorCode, message: string, fields?: FieldErrors) {
    super(message)
    this.code = code
    this.status = HTTP_STATUS[code]
    this.fields = fields
  }
}

export function notFound(entity: Entity): ApiError {
  return new ApiError('NOT_FOUND', E.notFound(entity))
}

export function validationError(fields: FieldErrors): ApiError {
  return new ApiError('VALIDATION_ERROR', E.validation, fields)
}

/** Devolve o valor validado ou lança o 422 com as mensagens de cada campo. */
export function unwrap<T>(result: Validation<T>): T {
  if (!result.ok) throw validationError(result.fields)
  return result.value
}
