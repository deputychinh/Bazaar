import { PromiseUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { UpstreamUnavailableError } from '../../common/errors/upstream-unavailable.error.js';
import {
  FORWARDED_REQUEST_HEADERS,
  FORWARDED_RESPONSE_HEADERS,
  UPSTREAM_TIMEOUT_MS,
} from '../../constants/gateway.constant.js';
import type {
  ProxiedRequest,
  ProxiedResponse,
} from '../../interfaces/proxied-response.interface.js';

/** Forwards one HTTP request to an internal service and returns its answer unchanged. */
@Injectable()
export class UpstreamClient {
  private static readonly methodsWithoutBody = new Set(['GET', 'HEAD']);

  public constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(UpstreamClient.name);
  }

  public async forward(baseUrl: string, request: ProxiedRequest): Promise<ProxiedResponse> {
    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers[name];
      if (typeof value === 'string') headers.set(name, value);
    }
    const hasBody =
      !UpstreamClient.methodsWithoutBody.has(request.method) && request.body !== undefined;
    let response: Response;
    try {
      response = await fetch(new URL(request.url, baseUrl), {
        method: request.method,
        headers,
        body: hasBody ? JSON.stringify(request.body) : undefined,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(
        { reason: PromiseUtil.errorMessage(error), url: request.url },
        'upstream unavailable',
      );
      throw new UpstreamUnavailableError(
        'The catalog is temporarily unavailable, please try again',
      );
    }
    const forwardedHeaders: Record<string, string> = {};
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = response.headers.get(name);
      if (value !== null) forwardedHeaders[name] = value;
    }
    return {
      status: response.status,
      headers: forwardedHeaders,
      body: Buffer.from(await response.arrayBuffer()),
    };
  }
}
