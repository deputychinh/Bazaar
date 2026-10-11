import { JWT_DEFAULT_AUDIENCE, JWT_DEFAULT_ISSUER } from '@bazaar/contracts';
import { baseEnvSchema } from '@bazaar/nest-common';
import { z } from 'zod';

import { CATALOG_DEFAULT_PORT, CATALOG_SERVICE_NAME } from '../constants/catalog.constant.js';

/** Every variable the catalog service reads (plan §6A.2 Config). */
export const catalogEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().min(1).default(CATALOG_SERVICE_NAME),
  PORT: z.coerce.number().int().positive().default(CATALOG_DEFAULT_PORT),
  CATALOG_DATABASE_URL: z.string().startsWith('mongodb://'),
  REDIS_URL: z.string().startsWith('redis://'),
  GATEWAY_JWKS_URL: z.url().default('http://127.0.0.1:4000/.well-known/jwks.json'),
  JWT_ISSUER: z.string().min(1).default(JWT_DEFAULT_ISSUER),
  JWT_AUDIENCE: z.string().min(1).default(JWT_DEFAULT_AUDIENCE),
  STORAGE_ENDPOINT: z.url().default('http://127.0.0.1:9002'),
  /** Base URL browsers use for images and presigned uploads. */
  STORAGE_PUBLIC_URL: z.url().default('http://127.0.0.1:9002'),
  STORAGE_REGION: z.string().min(1).default('us-east-1'),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_BUCKET_IMAGES: z.string().min(1).default('bazaar-images'),
});

export type CatalogEnv = z.infer<typeof catalogEnvSchema>;
