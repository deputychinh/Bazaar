import type { UserRole } from '@bazaar/contracts';

/** Who is calling, taken from a verified access token. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}
