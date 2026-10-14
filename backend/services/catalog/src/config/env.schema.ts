import { JWT_DEFAULT_AUDIENCE, JWT_DEFAULT_ISSUER } from '@bazaar/contracts';
import {
  baseEnvSchema,
  INTERNAL_API_KEY_MIN_LENGTH,
  MONGODB_URL_PATTERN,
  REDIS_URL_PATTERN,
} from '@bazaar/nest-common';
import { z } from 'zod';

import { CATALOG_DEFAULT_PORT, CATALOG_SERVICE_NAME } from '../constants/catalog.constant.js';

/** Every variable the catalog service reads (plan §6A.2 Config). */
export const catalogEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().min(1).default(CATALOG_SERVICE_NAME),
  PORT: z.coerce.number().int().positive().default(CATALOG_DEFAULT_PORT),
  CATALOG_DATABASE_URL: z.string().regex(MONGODB_URL_PATTERN),
  REDIS_URL: z.string().regex(REDIS_URL_PATTERN),
  GATEWAY_JWKS_URL: z.url().default('http://127.0.0.1:4000/.well-known/jwks.json'),
  JWT_ISSUER: z.string().min(1).default(JWT_DEFAULT_ISSUER),
  JWT_AUDIENCE: z.string().min(1).default(JWT_DEFAULT_AUDIENCE),
  /** Shared with the gateway for /internal routes; when unset they always answer 403. */
  INTERNAL_API_KEY: z.string().min(INTERNAL_API_KEY_MIN_LENGTH).optional(),
  STORAGE_ENDPOINT: z.url().default('http://127.0.0.1:9002'),
  /** Base URL browsers use for images and presigned uploads. */
  STORAGE_PUBLIC_URL: z.url().default('http://127.0.0.1:9002'),
  STORAGE_REGION: z.string().min(1).default('us-east-1'),
  /** Static keys locally (RustFS); unset on AWS, where Pod Identity supplies credentials. */
  STORAGE_ACCESS_KEY: z.string().min(1).optional(),
  STORAGE_SECRET_KEY: z.string().min(1).optional(),
  /** RustFS needs path-style URLs; AWS S3 prefers virtual-hosted (false). */
  STORAGE_FORCE_PATH_STYLE: z.stringbool().default(true),
  /** CDN that serves the images bucket at its root (AWS); default <public URL>/<bucket>. */
  STORAGE_IMAGE_BASE_URL: z.url().optional(),
  STORAGE_BUCKET_IMAGES: z.string().min(1).default('bazaar-images'),
});

export type CatalogEnv = z.infer<typeof catalogEnvSchema>;
