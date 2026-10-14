import { z } from 'zod';

import { Environment } from '../enums/environment.enum.js';
import { KafkaSaslMechanism } from '../enums/kafka-sasl-mechanism.enum.js';
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
  /** Managed Kafka (MSK) speaks TLS with SASL/SCRAM; locally both stay off. */
  KAFKA_SSL: z.stringbool().default(false),
  KAFKA_SASL_MECHANISM: z.enum(KafkaSaslMechanism).default(KafkaSaslMechanism.ScramSha512),
  KAFKA_SASL_USERNAME: z.string().min(1).optional(),
  KAFKA_SASL_PASSWORD: z.string().min(1).optional(),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
