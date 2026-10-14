import { Environment } from '../enums/environment.enum.js';
import { KafkaSaslMechanism } from '../enums/kafka-sasl-mechanism.enum.js';
import { LogLevel } from '../enums/log-level.enum.js';
import { ConfigValidationError } from '../errors/config-validation.error.js';

import { AppConfigLoader } from './app-config-loader.js';
import { baseEnvSchema } from './base-env.schema.js';

describe('AppConfigLoader', () => {
  it('parses env values and applies defaults', () => {
    const config = AppConfigLoader.load(baseEnvSchema, {
      SERVICE_NAME: 'gateway',
      PORT: '4000',
      KAFKA_BROKERS: 'localhost:9094, kafka:9092,',
    });

    expect(config).toEqual({
      NODE_ENV: Environment.Development,
      SERVICE_NAME: 'gateway',
      PORT: 4000,
      LOG_LEVEL: LogLevel.Info,
      KAFKA_BROKERS: ['localhost:9094', 'kafka:9092'],
      KAFKA_SSL: false,
      KAFKA_SASL_MECHANISM: KafkaSaslMechanism.ScramSha512,
    });
  });

  it('lists every invalid variable in one error', () => {
    let error: unknown;
    try {
      AppConfigLoader.load(baseEnvSchema, { PORT: 'abc', LOG_LEVEL: 'loud' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConfigValidationError);
    const issues = (error as ConfigValidationError).issues.join('\n');
    expect(issues).toContain('SERVICE_NAME');
    expect(issues).toContain('PORT');
    expect(issues).toContain('LOG_LEVEL');
    expect(issues).toContain('KAFKA_BROKERS');
  });
});
