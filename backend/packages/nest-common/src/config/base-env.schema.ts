import { z } from 'zod';

import { Environment } from '../enums/environment.enum.js';
import { LogLevel } from '../enums/log-level.enum.js';

/** Variables every service needs; each service extends this schema with its own. */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(Environment).default(Environment.Development),
  SERVICE_NAME: z.string().min(1),
  PORT: z.coerce.number().int().positive(),
  LOG_LEVEL: z.enum(LogLevel).default(LogLevel.Info),
  KAFKA_BROKERS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((broker) => broker.trim())
        .filter((broker) => broker.length > 0),
    ),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
