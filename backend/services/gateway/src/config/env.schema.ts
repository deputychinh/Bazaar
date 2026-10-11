import { JWT_DEFAULT_AUDIENCE, JWT_DEFAULT_ISSUER } from '@bazaar/contracts';
import { baseEnvSchema } from '@bazaar/nest-common';
import { z } from 'zod';

import { GATEWAY_DEFAULT_PORT, GATEWAY_SERVICE_NAME } from '../constants/gateway.constant.js';

const commaList = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
);

/** Every variable the gateway reads (plan §6A.2 Config). */
export const gatewayEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().min(1).default(GATEWAY_SERVICE_NAME),
  PORT: z.coerce.number().int().positive().default(GATEWAY_DEFAULT_PORT),
  IDENTITY_DATABASE_URL: z.string().startsWith('mysql://'),
  REDIS_URL: z.string().startsWith('redis://'),
  JWT_PRIVATE_KEY_FILE: z.string().min(1).default('.secrets/jwt-private.pem'),
  JWT_PUBLIC_KEY_FILE: z.string().min(1).default('.secrets/jwt-public.pem'),
  JWT_ISSUER: z.string().min(1).default(JWT_DEFAULT_ISSUER),
  JWT_AUDIENCE: z.string().min(1).default(JWT_DEFAULT_AUDIENCE),
  WEB_APP_URL: z.url().default('http://localhost:3100'),
  CORS_ORIGINS: commaList.default(['http://localhost:3100', 'http://localhost:3200']),
  COOKIE_SECURE: z.stringbool().default(false),
  CATALOG_SERVICE_URL: z.url().default('http://127.0.0.1:4010'),
});

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;
