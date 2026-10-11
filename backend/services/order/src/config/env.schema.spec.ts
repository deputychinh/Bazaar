import { orderEnvSchema } from './env.schema.js';

const required = {
  ORDER_DATABASE_URL: 'mysql://u:p@localhost:3307/bazaar_order',
  REDIS_URL: 'redis://localhost:6380',
  KAFKA_BROKERS: 'localhost:9094',
};

describe('orderEnvSchema', () => {
  it('applies the service defaults', () => {
    const env = orderEnvSchema.parse(required);
    expect(env).toMatchObject({ SERVICE_NAME: 'order', PORT: 4020 });
  });

  it('refuses a non-MySQL database URL', () => {
    expect(
      orderEnvSchema.safeParse({ ...required, ORDER_DATABASE_URL: 'mongodb://x' }).success,
    ).toBe(false);
  });
});
