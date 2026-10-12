import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';

import { UpstreamClient } from './upstream-client.js';

/** Sends the incoming request to a service and writes its answer back unchanged. */
@Injectable()
export class ProxyForwarder {
  public constructor(private readonly upstream: UpstreamClient) {}

  public async forward(baseUrl: string, request: Request, response: Response): Promise<void> {
    const answer = await this.upstream.forward(baseUrl, {
      method: request.method,
      url: request.originalUrl,
      headers: {
        ...request.headers,
        'x-request-id':
          typeof request.id === 'string' ? request.id : request.headers['x-request-id'],
      },
      body: request.body as unknown,
    });
    response.status(answer.status).set(answer.headers).send(answer.body);
  }
}
