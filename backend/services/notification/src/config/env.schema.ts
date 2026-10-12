import { JWT_DEFAULT_AUDIENCE, JWT_DEFAULT_ISSUER } from '@bazaar/contracts';
import { baseEnvSchema } from '@bazaar/nest-common';
import { z } from 'zod';

import {
  NOTIFICATION_DEFAULT_PORT,
  NOTIFICATION_SERVICE_NAME,
} from '../constants/notification.constant.js';

/** Every variable the notification service reads (plan §6A.2 Config). */
export const notificationEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().min(1).default(NOTIFICATION_SERVICE_NAME),
  PORT: z.coerce.number().int().positive().default(NOTIFICATION_DEFAULT_PORT),
  NOTIFICATION_DATABASE_URL: z.string().startsWith('mongodb://'),
  REDIS_URL: z.string().startsWith('redis://'),
  GATEWAY_JWKS_URL: z.url().default('http://127.0.0.1:4000/.well-known/jwks.json'),
  JWT_ISSUER: z.string().min(1).default(JWT_DEFAULT_ISSUER),
  JWT_AUDIENCE: z.string().min(1).default(JWT_DEFAULT_AUDIENCE),
  SMTP_HOST: z.string().min(1).default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().int().positive().default(1026),
  MAIL_FROM: z.string().min(3).default('Bazaar <no-reply@bazaar.test>'),
  /** Customer site, for links in emails (order pages). */
  WEB_APP_URL: z.url().default('http://localhost:3100'),
  /** How often queued emails are sent. */
  /** Web on-demand ISR endpoint and its shared secret; revalidation is off without a secret. */
  WEB_REVALIDATE_URL: z.url().default('http://localhost:3100/api/revalidate'),
  REVALIDATE_SECRET: z.string().min(32).optional(),
  EMAIL_RELAY_INTERVAL_MS: z.coerce.number().int().min(200).default(2_000),
});

export type NotificationEnv = z.infer<typeof notificationEnvSchema>;
