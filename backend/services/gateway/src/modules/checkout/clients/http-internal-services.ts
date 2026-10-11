import {
  type CreateOrderRequest,
  orderViewSchema,
  problemDetailsSchema,
  type QuoteRequest,
  type QuoteResponse,
  quoteResponseSchema,
} from '@bazaar/contracts';
import { INTERNAL_API_KEY_HEADER, PromiseUtil } from '@bazaar/nest-common';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { UpstreamProblemError } from '../../../common/errors/upstream-problem.error.js';
import { UpstreamUnavailableError } from '../../../common/errors/upstream-unavailable.error.js';
import { AppConfig } from '../../../config/app-config.js';
import {
  INTERNAL_ORDERS_PATH,
  INTERNAL_QUOTE_PATH,
  UPSTREAM_TIMEOUT_MS,
} from '../../../constants/gateway.constant.js';
import type { CreatedOrder } from '../../../interfaces/created-order.interface.js';
import type { InternalCall } from '../../../interfaces/internal-call.interface.js';

import { InternalServices } from './internal-services.js';

const UNAVAILABLE = 'Checkout is temporarily unavailable, please try again';
const CREATED: number = HttpStatus.CREATED;
const SERVER_ERROR: number = HttpStatus.INTERNAL_SERVER_ERROR;

/**
 * JSON over HTTP with the internal key. Answers are validated against the shared contracts;
 * problem details from a service are passed on with their code, anything else is "unavailable".
 */
@Injectable()
export class HttpInternalServices extends InternalServices {
  public constructor(
    private readonly config: AppConfig,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(HttpInternalServices.name);
  }

  public async quote(request: QuoteRequest): Promise<QuoteResponse> {
    const { body } = await this.post({
      baseUrl: this.config.env.CATALOG_SERVICE_URL,
      path: INTERNAL_QUOTE_PATH,
      payload: request,
    });
    return quoteResponseSchema.parse(body);
  }

  public async createOrder(
    request: CreateOrderRequest,
    authorization: string,
  ): Promise<CreatedOrder> {
    const { status, body } = await this.post({
      baseUrl: this.config.env.ORDER_SERVICE_URL,
      path: INTERNAL_ORDERS_PATH,
      payload: request,
      headers: { authorization },
    });
    return { order: orderViewSchema.parse(body), created: status === CREATED };
  }

  private async post({
    baseUrl,
    path,
    payload,
    headers = {},
  }: InternalCall): Promise<{ status: number; body: unknown }> {
    const key = this.config.env.INTERNAL_API_KEY;
    if (key === undefined) {
      throw new UpstreamUnavailableError('Checkout is not configured (INTERNAL_API_KEY)');
    }
    let response: Response;
    let body: unknown;
    try {
      response = await fetch(new URL(path, baseUrl), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [INTERNAL_API_KEY_HEADER]: key,
          ...headers,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      body = await response.json();
    } catch (error) {
      this.logger.error({ reason: PromiseUtil.errorMessage(error), path }, 'internal call failed');
      throw new UpstreamUnavailableError(UNAVAILABLE);
    }
    if (response.ok) return { status: response.status, body };
    const problem = problemDetailsSchema.safeParse(body);
    if (problem.success && response.status < SERVER_ERROR) {
      throw new UpstreamProblemError(problem.data);
    }
    this.logger.error({ status: response.status, path }, 'internal call failed');
    throw new UpstreamUnavailableError(UNAVAILABLE);
  }
}
