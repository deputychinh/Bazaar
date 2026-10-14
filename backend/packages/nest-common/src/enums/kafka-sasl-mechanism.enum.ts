/** SASL mechanisms the Kafka client may use (MSK: SCRAM-SHA-512). */
export enum KafkaSaslMechanism {
  ScramSha512 = 'scram-sha-512',
  ScramSha256 = 'scram-sha-256',
  Plain = 'plain',
}
