import { ErrorCode, type ProblemDetails } from '@bazaar/contracts';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import {
  ERROR_HTTP_STATUS,
  HTTP_STATUS_ERROR_CODE,
} from '../constants/error-http-status.constant.js';
import { DomainError } from '../errors/domain-error.js';

/** Turns every thrown error into one problem-details body (plan §5.4). */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  public constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ProblemDetailsFilter.name);
  }

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const problem = this.toProblem(exception);
    if (problem.status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error({ err: exception, path: request.url }, 'unhandled error');
    }
    const traceId =
      typeof request.id === 'string' || typeof request.id === 'number'
        ? String(request.id)
        : undefined;
    http
      .getResponse<Response>()
      .status(problem.status)
      .json({ ...problem, traceId });
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof DomainError) {
      return {
        code: exception.code,
        message: exception.message,
        status: ERROR_HTTP_STATUS[exception.code],
        details: exception.details,
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        code: HTTP_STATUS_ERROR_CODE[status] ?? ErrorCode.Internal,
        message: exception.message,
        status,
      };
    }
    return {
      code: ErrorCode.Internal,
      message: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }
}
