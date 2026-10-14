import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { Histogram } from 'prom-client';

import { HEALTH_ROUTE } from '../constants/health.constant.js';
import {
  HTTP_DURATION_BUCKETS,
  METRICS_ROUTE,
  UNMATCHED_ROUTE,
} from '../constants/metrics.constant.js';

import { MetricsRegistry } from './metrics.registry.js';

/**
 * RED metrics per route: one histogram gives rate, errors (by status) and duration. The route label
 * is the matched template (`/api/v1/products/:slug`), never the raw URL, so cardinality stays small.
 */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  private readonly duration: Histogram;

  public constructor(registry: MetricsRegistry) {
    this.duration = registry.histogram({
      name: 'http_server_request_duration_seconds',
      help: 'HTTP request duration by method, route template and status code',
      labelNames: ['method', 'route', 'status_code'],
      buckets: HTTP_DURATION_BUCKETS,
    });
  }

  public use(request: Request, response: Response, next: NextFunction): void {
    const path = request.originalUrl;
    if (path.startsWith(`/${METRICS_ROUTE}`) || path.startsWith(`/${HEALTH_ROUTE}`)) {
      next();
      return;
    }
    const stop = this.duration.startTimer();
    response.once('finish', () => {
      stop({
        method: request.method,
        route: HttpMetricsMiddleware.routeOf(request),
        status_code: String(response.statusCode),
      });
    });
    next();
  }

  /** Express sets `route` once a handler matched; baseUrl carries the mount path. */
  public static routeOf(request: Request): string {
    const route = (request.route as { path?: unknown } | undefined)?.path;
    return typeof route === 'string' ? `${request.baseUrl}${route}` : UNMATCHED_ROUTE;
  }
}
