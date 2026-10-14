/** Data-store settings shared by dev and prod (sizes live in environments.ts). */
export const MYSQL_PORT = 3306;
export const MSK_SASL_SCRAM_TLS_PORT = 9096;
export const VALKEY_PORT = 6379;
/** Atlas PrivateLink endpoints answer on this range (MongoDB Atlas docs). */
export const ATLAS_PRIVATELINK_PORTS = { from: 1024, to: 65535 } as const;

export const VALKEY_ENGINE_VERSION = '8.1';
export const MONGODB_MAJOR_VERSION = '8.0';
export const ATLAS_CLUSTER_NAME = 'bazaar';

/** One MySQL database per service (plan DS-02). Users are created by the bootstrap Job. */
export const MYSQL_DATABASES = { identity: 'bazaar_identity', order: 'bazaar_order' } as const;
/** One MongoDB database per service. */
export const MONGO_DATABASES = {
  catalog: 'bazaar_catalog',
  notification: 'bazaar_notification',
} as const;

/** Kafka broker settings: topics come from a k8s Job, never auto-created. */
export const MSK_SERVER_PROPERTIES = [
  'auto.create.topics.enable=false',
  'default.replication.factor=3',
  'min.insync.replicas=2',
  'num.partitions=3',
  'unclean.leader.election.enable=false',
].join('\n');

export const BACKUP_TRANSITION_DAYS = 30;
export const BACKUP_EXPIRY_DAYS = 365;
export const NONCURRENT_VERSION_EXPIRY_DAYS = 30;
