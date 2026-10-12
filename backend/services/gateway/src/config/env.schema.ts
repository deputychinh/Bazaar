import { JWT_DEFAULT_AUDIENCE, JWT_DEFAULT_ISSUER } from '@bazaar/contracts';
import { baseEnvSchema, INTERNAL_API_KEY_MIN_LENGTH } from '@bazaar/nest-common';
import { z } from 'zod';

import { GATEWAY_DEFAULT_PORT, GATEWAY_SERVICE_NAME } from '../constants/gateway.constant.js';
import { FxProviderKind } from '../enums/fx-provider-kind.enum.js';

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
  /**
   * Proxy hops whose X-Forwarded-For is trusted (Express "trust proxy"); 0 = socket address.
   * Count only proxies that append the client IP (the Traefik ingress). The Next rewrite does not — it
   * passes a client-sent header through — so it must not be counted, or clients could spoof IPs.
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  CATALOG_SERVICE_URL: z.url().default('http://127.0.0.1:4010'),
  ORDER_SERVICE_URL: z.url().default('http://127.0.0.1:4020'),
  NOTIFICATION_SERVICE_URL: z.url().default('http://127.0.0.1:4030'),
  /** Shared key for /internal routes of the catalog and order services (checkout). */
  INTERNAL_API_KEY: z.string().min(INTERNAL_API_KEY_MIN_LENGTH).optional(),
  FX_PROVIDER: z.enum(FxProviderKind).default(FxProviderKind.Http),
  FX_API_URL: z.url().default('https://open.er-api.com/v6/latest/USD'),
  /** VND per USD used by the static provider and as the last-resort fallback. */
  FX_STATIC_USD_VND: z.coerce.number().positive().default(26_000),
});

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;
