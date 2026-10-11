// MongoDB schema for bazaar_notification: collections, validators and every index.
// Idempotent — run with `make db-schema`. Prisma cannot create these for MongoDB (ADR 0011).

const ensureCollection = (name, jsonSchema) => {
  const options = {
    validator: { $jsonSchema: jsonSchema },
    validationLevel: 'moderate',
    validationAction: 'error',
  };
  if (db.getCollectionNames().includes(name)) {
    db.runCommand({ collMod: name, ...options });
  } else {
    db.createCollection(name, options);
  }
};

ensureCollection('contacts', {
  bsonType: 'object',
  required: ['_id', 'email', 'preferredLocale'],
  properties: {
    _id: { bsonType: 'string' },
    email: { bsonType: 'string', minLength: 3 },
    preferredLocale: { enum: ['en', 'vi'] },
  },
});

ensureCollection('notifications', {
  bsonType: 'object',
  required: ['userId', 'kind', 'data', 'createdAt'],
  properties: {
    userId: { bsonType: 'string' },
    kind: { bsonType: 'string' },
    orderId: { bsonType: ['string', 'null'] },
    data: { bsonType: 'object' },
    readAt: { bsonType: ['date', 'null'] },
    createdAt: { bsonType: 'date' },
  },
});
db.notifications.createIndex({ userId: 1, createdAt: -1 }, { name: 'notifications_user_newest' });
db.notifications.createIndex(
  { userId: 1, readAt: 1 },
  { name: 'notifications_user_unread', partialFilterExpression: { readAt: null } },
);
// In-app notifications are kept for 180 days (plan §7.3).
db.notifications.createIndex(
  { createdAt: 1 },
  { name: 'notifications_ttl', expireAfterSeconds: 180 * 24 * 3600 },
);

ensureCollection('event_log', {
  bsonType: 'object',
  required: ['_id', 'type', 'topic', 'aggregateId', 'occurredAt', 'payload'],
  properties: {
    _id: { bsonType: 'string' },
    type: { bsonType: 'string' },
    topic: { bsonType: 'string' },
    aggregateId: { bsonType: 'string' },
    occurredAt: { bsonType: 'date' },
    payload: { bsonType: 'object' },
  },
});
db.event_log.createIndex({ occurredAt: -1 }, { name: 'event_log_newest' });
db.event_log.createIndex({ type: 1, occurredAt: -1 }, { name: 'event_log_type' });
db.event_log.createIndex({ aggregateId: 1, occurredAt: 1 }, { name: 'event_log_aggregate' });

// Kafka keeps messages 7 days, so remembering processed ids for 30 days is enough.
db.processed_events.createIndex(
  { processedAt: 1 },
  { name: 'processed_events_ttl', expireAfterSeconds: 30 * 24 * 3600 },
);

print('bazaar_notification schema ready');
