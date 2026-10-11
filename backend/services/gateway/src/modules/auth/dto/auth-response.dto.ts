import { z } from 'zod';

import { userResponseSchema } from '../../users/dto/user-response.dto.js';

export const sessionResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
  user: userResponseSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
