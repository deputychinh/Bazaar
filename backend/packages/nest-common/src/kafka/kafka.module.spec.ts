import { baseEnvSchema } from '../config/base-env.schema.js';
import { KafkaSaslMechanism } from '../enums/kafka-sasl-mechanism.enum.js';

import { KafkaModule } from './kafka.module.js';

const env = (extra: Record<string, string> = {}) =>
  baseEnvSchema.parse({
    SERVICE_NAME: 'order',
    PORT: '4020',
    KAFKA_BROKERS: 'a:9092, b:9092',
    ...extra,
  });

describe('KafkaModule.optionsFromEnv', () => {
  it('connects in plaintext without SASL by default (local Kafka)', () => {
    expect(KafkaModule.optionsFromEnv(env())).toEqual({
      clientId: 'order',
      brokers: ['a:9092', 'b:9092'],
      ssl: false,
    });
  });

  it('uses TLS and SCRAM-SHA-512 when credentials are given (MSK)', () => {
    const options = KafkaModule.optionsFromEnv(
      env({ KAFKA_SSL: 'true', KAFKA_SASL_USERNAME: 'bazaar', KAFKA_SASL_PASSWORD: 'secret' }),
    );
    expect(options).toMatchObject({
      ssl: true,
      sasl: { mechanism: KafkaSaslMechanism.ScramSha512, username: 'bazaar', password: 'secret' },
    });
  });

  it('ignores a username without a password', () => {
    expect(KafkaModule.optionsFromEnv(env({ KAFKA_SASL_USERNAME: 'bazaar' })).sasl).toBeUndefined();
  });
});
