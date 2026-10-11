import type { Locale, UserRole, UserStatus } from '@bazaar/contracts';

/** The identity user as the services see it (never a Prisma model). */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  preferredLocale: Locale;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  preferredLocale: Locale;
}
