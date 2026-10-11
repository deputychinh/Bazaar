import type { UserRole } from '@bazaar/contracts';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ROLES_KEY } from '../constants/metadata.constant.js';
import { ForbiddenError } from '../errors/forbidden.error.js';

/** Global guard: enforces @Roles(...) after AccessTokenGuard has identified the caller. */
@Injectable()
export class RolesGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles === undefined || roles.length === 0) {
      return true;
    }
    const user = context.switchToHttp().getRequest<Request>().user;
    if (user === undefined || !roles.includes(user.role)) {
      throw new ForbiddenError('Your role cannot use this endpoint');
    }
    return true;
  }
}
