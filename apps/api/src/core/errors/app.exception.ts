import { HttpException, HttpStatus } from '@nestjs/common'
import { ERROR_CODES, ErrorCode } from './error-codes'

export class AppException extends HttpException {
  public readonly code: ErrorCode

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        error: {
          code: ERROR_CODES[code],
          message,
          details: details ?? null,
        },
      },
      statusCode,
    )
    this.code = code
  }

  static notFound(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    return new AppException(code, message, details, HttpStatus.NOT_FOUND)
  }

  static unauthorized(code: ErrorCode, message: string) {
    return new AppException(code, message, undefined, HttpStatus.UNAUTHORIZED)
  }

  static forbidden(code: ErrorCode, message: string) {
    return new AppException(code, message, undefined, HttpStatus.FORBIDDEN)
  }
}
