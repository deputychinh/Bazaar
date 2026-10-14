import type { KafkaSaslMechanism } from '../enums/kafka-sasl-mechanism.enum.js';

export interface KafkaSaslOptions {
  mechanism: KafkaSaslMechanism;
  username: string;
  password: string;
}
