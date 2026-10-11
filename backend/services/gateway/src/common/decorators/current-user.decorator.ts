import { UnauthenticatedError } from '@bazaar/nest-common';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../interfaces/authenticated-user.interface.js';

/** Injects the caller of an authenticated route. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = context.switchToHttp().getRequest<Request>().user;
    if (user === undefined) {
      throw new UnauthenticatedError('Authentication required');
    }
    return user;
  },
);
