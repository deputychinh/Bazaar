import { JWT_DEFAULT_AUDIENCE, JWT_DEFAULT_ISSUER } from '@bazaar/contracts';
import { baseEnvSchema } from '@bazaar/nest-common';
import { z } from 'zod';

import { ORDER_DEFAULT_PORT, ORDER_SERVICE_NAME } from '../constants/order.constant.js';

/** Every variable the order service reads (plan §6A.2 Config). */
export const orderEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().min(1).default(ORDER_SERVICE_NAME),
  PORT: z.coerce.number().int().positive().default(ORDER_DEFAULT_PORT),
  ORDER_DATABASE_URL: z.string().startsWith('mysql://'),
  REDIS_URL: z.string().startsWith('redis://'),
  GATEWAY_JWKS_URL: z.url().default('http://127.0.0.1:4000/.well-known/jwks.json'),
  JWT_ISSUER: z.string().min(1).default(JWT_DEFAULT_ISSUER),
  JWT_AUDIENCE: z.string().min(1).default(JWT_DEFAULT_AUDIENCE),
});

export type OrderEnv = z.infer<typeof orderEnvSchema>;
