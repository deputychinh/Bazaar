import { randomUUID } from 'node:crypto';

import { type DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { HEALTH_ROUTE } from '../constants/health.constant.js';
import { LOG_REDACT_PATHS, REQUEST_ID_HEADER } from '../constants/logger.constant.js';
import type { LoggerModuleOptions } from '../interfaces/logger-module-options.interface.js';

/** Structured JSON logging (pino) with request ids, redaction and quiet health checks. */
@Module({})
export class AppLoggerModule {
  public static forRoot(options: LoggerModuleOptions): DynamicModule {
    return {
      module: AppLoggerModule,
      global: true,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            level: options.level,
            base: { service: options.serviceName },
            redact: LOG_REDACT_PATHS,
            genReqId: (request) => {
              const header = request.headers[REQUEST_ID_HEADER];
              return typeof header === 'string' && header.length > 0 ? header : randomUUID();
            },
            autoLogging: {
              ignore: (request) => request.url?.startsWith(`/${HEALTH_ROUTE}`) ?? false,
            },
            transport: options.pretty ? { target: 'pino-pretty' } : undefined,
          },
        }),
      ],
      exports: [LoggerModule],
    };
  }
}
