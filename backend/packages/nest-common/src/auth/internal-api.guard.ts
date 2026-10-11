import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { SERVICE_AUTH_OPTIONS } from '../constants/injection-token.constant.js';
import { INTERNAL_API_KEY_HEADER } from '../constants/internal-api.constant.js';
import { IS_INTERNAL_KEY } from '../constants/metadata.constant.js';
import { ForbiddenError } from '../errors/forbidden.error.js';
import type { ServiceAuthModuleOptions } from '../interfaces/service-auth-options.interface.js';
import { SecretUtil } from '../utils/secret.util.js';

/** Global guard, runs first: @Internal() routes need the shared internal key (plan §P4). */
@Injectable()
export class InternalApiGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    @Inject(SERVICE_AUTH_OPTIONS) private readonly options: ServiceAuthModuleOptions,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const isInternal = this.reflector.getAllAndOverride<boolean | undefined>(IS_INTERNAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isInternal !== true) {
      return true;
    }
    const expected = this.options.internalApiKey;
    const given = context.switchToHttp().getRequest<Request>().headers[INTERNAL_API_KEY_HEADER];
    // Without a configured key the internal API is closed rather than open.
    if (
      expected === undefined ||
      typeof given !== 'string' ||
      !SecretUtil.matches(given, expected)
    ) {
      throw new ForbiddenError('Internal endpoint');
    }
    return true;
  }
}
