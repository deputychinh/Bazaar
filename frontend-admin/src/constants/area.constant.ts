import { UserRole } from '@/api/gateway.schema';

/** Who may use each area of the admin site (plan §6.2, route guards by role). */
export const AREA_ROLES = {
  seller: [UserRole.SELLER],
  platform: [UserRole.ADMIN],
} as const;
/** Where each role lands after signing in. */
export const HOME_BY_ROLE: Readonly<Partial<Record<UserRole, string>>> = {
  [UserRole.SELLER]: '/seller',
  [UserRole.ADMIN]: '/platform',
};
