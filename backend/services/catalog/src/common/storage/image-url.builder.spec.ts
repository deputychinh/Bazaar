import { AppConfig } from '../../config/app-config.js';
import { catalogEnvSchema } from '../../config/env.schema.js';

import { ImageUrlBuilder } from './image-url.builder.js';

const builder = (extra: Record<string, string> = {}): ImageUrlBuilder =>
  new ImageUrlBuilder(
    new AppConfig(
      catalogEnvSchema.parse({
        CATALOG_DATABASE_URL: 'mongodb+srv://cluster-pl-0.example.mongodb.net/bazaar_catalog',
        REDIS_URL: 'rediss://cache.example:6379',
        KAFKA_BROKERS: 'b-1.msk.example:9096',
        STORAGE_PUBLIC_URL: 'http://storage.bazaar.localhost/',
        ...extra,
      }),
    ),
  );

describe('ImageUrlBuilder', () => {
  it('puts the bucket in the path on S3-compatible storage (RustFS locally)', () => {
    expect(builder().url('products/p1/a.webp')).toBe(
      'http://storage.bazaar.localhost/bazaar-images/products/p1/a.webp',
    );
  });

  it('serves from the CDN root when one fronts the bucket (AWS)', () => {
    expect(
      builder({ STORAGE_IMAGE_BASE_URL: 'https://images.bazaar.example/' }).url(
        'products/p1/a.webp',
      ),
    ).toBe('https://images.bazaar.example/products/p1/a.webp');
  });
});

describe('catalog env on managed services', () => {
  it('accepts TLS Redis, Atlas SRV URLs and no static storage keys', () => {
    const env = catalogEnvSchema.parse({
      CATALOG_DATABASE_URL: 'mongodb+srv://cluster-pl-0.example.mongodb.net/bazaar_catalog',
      REDIS_URL: 'rediss://:token@cache.example:6379',
      KAFKA_BROKERS: 'b-1.msk.example:9096',
      STORAGE_FORCE_PATH_STYLE: 'false',
    });
    expect(env.STORAGE_ACCESS_KEY).toBeUndefined();
    expect(env.STORAGE_FORCE_PATH_STYLE).toBe(false);
  });
});
