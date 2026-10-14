import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { PrismaInstrumentation } from '@prisma/instrumentation';

import { OTLP_ENDPOINT_ENV, UNTRACED_PATH_PREFIXES } from '../constants/tracing.constant.js';
import type { TracingOptions } from '../interfaces/tracing-options.interface.js';

/**
 * OpenTelemetry bootstrap (plan §9.3, NFR-08). Loaded on its own subpath
 * (`@bazaar/nest-common/tracing`) as the first import of main.ts, so http, fetch, express, redis,
 * Prisma and pino are patched before anything loads them. Exports OTLP over HTTP to OTEL_EXPORTER_OTLP_ENDPOINT;
 * without it nothing starts and the API stays a no-op.
 */
export class Tracing {
  private static sdk: NodeSDK | undefined;

  public static start(options: TracingOptions): boolean {
    // eslint-disable-next-line no-restricted-properties -- runs before any config module exists
    const env = options.env ?? process.env;
    if (Tracing.sdk !== undefined || !env[OTLP_ENDPOINT_ENV]) {
      return false;
    }
    Tracing.sdk = new NodeSDK({
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: options.serviceName }),
      instrumentations: [
        new HttpInstrumentation({
          ignoreIncomingRequestHook: (request) =>
            UNTRACED_PATH_PREFIXES.some((prefix) => request.url?.startsWith(prefix) ?? false),
        }),
        new ExpressInstrumentation(),
        // fetch(): the gateway's calls to the services, so their spans join the request's trace.
        new UndiciInstrumentation(),
        new RedisInstrumentation(),
        new PrismaInstrumentation(),
        // Every log line written inside a span carries its ids.
        new PinoInstrumentation({
          logKeys: { traceId: 'traceId', spanId: 'spanId', traceFlags: 'traceFlags' },
        }),
      ],
    });
    Tracing.sdk.start();
    process.once('SIGTERM', () => void Tracing.sdk?.shutdown());
    return true;
  }
}
