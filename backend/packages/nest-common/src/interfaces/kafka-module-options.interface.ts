import type { KafkaSaslOptions } from './kafka-sasl-options.interface.js';

export interface KafkaModuleOptions {
  clientId: string;
  brokers: string[];
  /** TLS to the brokers (MSK); plaintext when false, as locally. */
  ssl?: boolean;
  sasl?: KafkaSaslOptions;
}
