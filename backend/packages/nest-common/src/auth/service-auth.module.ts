import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { SERVICE_AUTH_OPTIONS } from '../constants/injection-token.constant.js';
import type { ServiceAuthModuleOptions } from '../interfaces/service-auth-options.interface.js';

import { AccessTokenGuard } from './access-token.guard.js';
import { InternalApiGuard } from './internal-api.guard.js';
import { JwksTokenVerifier } from './jwks-token-verifier.js';
import { RolesGuard } from './roles.guard.js';
import { TokenVerifier } from './token-verifier.js';

/** For services behind the gateway: verify tokens with its JWKS, enforce @Internal / @Public / @Roles. */
@Module({})
export class ServiceAuthModule {
  public static forRoot(options: ServiceAuthModuleOptions): DynamicModule {
    return {
      module: ServiceAuthModule,
      providers: [
        { provide: SERVICE_AUTH_OPTIONS, useValue: options },
        { provide: TokenVerifier, useClass: JwksTokenVerifier },
        // Guards run in this order: internal key, then access token, then roles.
        { provide: APP_GUARD, useClass: InternalApiGuard },
        { provide: APP_GUARD, useClass: AccessTokenGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
      exports: [TokenVerifier],
    };
  }
}
