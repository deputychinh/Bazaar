import { ErrorCode } from '@bazaar/contracts';
import { HttpStatus } from '@nestjs/common';

/** The one table that maps error codes to HTTP status codes (plan §6A.3). */
export const ERROR_HTTP_STATUS: Readonly<Record<ErrorCode, HttpStatus>> = {
  [ErrorCode.ValidationFailed]: HttpStatus.BAD_REQUEST,
  [ErrorCode.Unauthenticated]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.Forbidden]: HttpStatus.FORBIDDEN,
  [ErrorCode.NotFound]: HttpStatus.NOT_FOUND,
  [ErrorCode.Conflict]: HttpStatus.CONFLICT,
  [ErrorCode.RateLimited]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCode.InvalidEvent]: HttpStatus.BAD_REQUEST,
  [ErrorCode.EmailAlreadyRegistered]: HttpStatus.CONFLICT,
  [ErrorCode.InvalidCredentials]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.EmailNotVerified]: HttpStatus.FORBIDDEN,
  [ErrorCode.TokenExpired]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.OutOfStock]: HttpStatus.CONFLICT,
  [ErrorCode.InvalidOrderTransition]: HttpStatus.CONFLICT,
  [ErrorCode.PaymentFailed]: HttpStatus.PAYMENT_REQUIRED,
  [ErrorCode.Internal]: HttpStatus.INTERNAL_SERVER_ERROR,
};

/** Error code used when a framework `HttpException` (not a DomainError) is thrown. */
export const HTTP_STATUS_ERROR_CODE: Readonly<Partial<Record<number, ErrorCode>>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.ValidationFailed,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.Unauthenticated,
  [HttpStatus.FORBIDDEN]: ErrorCode.Forbidden,
  [HttpStatus.NOT_FOUND]: ErrorCode.NotFound,
  [HttpStatus.CONFLICT]: ErrorCode.Conflict,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RateLimited,
};
