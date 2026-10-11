import { UserRole } from '@bazaar/contracts';
import { z } from 'zod';

/** Claims every Bazaar access token must carry. */
export const accessTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  role: z.enum(UserRole),
});

export type AccessTokenClaims = z.infer<typeof accessTokenClaimsSchema>;
