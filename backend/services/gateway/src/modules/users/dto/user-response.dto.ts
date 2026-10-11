import { Locale, UserRole, UserStatus } from '@bazaar/contracts';
import { z } from 'zod';

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: z.enum(UserRole),
  status: z.enum(UserStatus),
  preferredLocale: z.enum(Locale),
  createdAt: z.iso.datetime(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
