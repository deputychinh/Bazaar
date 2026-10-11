import { localeSchema, userRoleSchema, userStatusSchema } from '@bazaar/contracts';
import { z } from 'zod';

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: userRoleSchema,
  status: userStatusSchema,
  preferredLocale: localeSchema,
  createdAt: z.iso.datetime(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
