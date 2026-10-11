import type { UserRole } from '@bazaar/contracts';
import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '../../constants/metadata.constant.js';

/** Restricts a route to the given roles. */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
