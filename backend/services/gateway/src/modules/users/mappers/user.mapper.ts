import { Locale, UserRole, UserStatus } from '@bazaar/contracts';

import type { User as UserRow } from '#prisma';

import type { User } from '../../../interfaces/user.interface.js';
import { EnumUtil } from '../../../utils/enum.util.js';
import type { UserResponse } from '../dto/user-response.dto.js';

export class UserMapper {
  public static toDomain(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      role: EnumUtil.parse(UserRole, row.role),
      status: EnumUtil.parse(UserStatus, row.status),
      preferredLocale: EnumUtil.parse(Locale, row.preferredLocale),
      emailVerifiedAt: row.emailVerifiedAt,
      createdAt: row.createdAt,
    };
  }

  /** Public shape — never includes the password hash. */
  public static toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      preferredLocale: user.preferredLocale,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
