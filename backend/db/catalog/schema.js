// MongoDB schema for bazaar_catalog: collections, validators and every index.
// Idempotent — run with `make db-schema`. Prisma cannot create these for MongoDB (ADR 0011).
// Status values are not repeated here: the single source is the enums in @bazaar/contracts.

const localizedText = {
  bsonType: 'object',
  required: ['en'],
  properties: {
    en: { bsonType: 'string', minLength: 1 },
    vi: { bsonType: ['string', 'null'] },
  },
};
const integer = { bsonType: ['int', 'long'] };
const nonNegativeInteger = { bsonType: ['int', 'long'], minimum: 0 };

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

ensureCollection('categories', {
  bsonType: 'object',
  required: ['slug', 'name', 'path', 'sortOrder'],
  properties: {
    slug: { bsonType: 'string', pattern: '^[a-z0-9-]+$' },
    name: localizedText,
    parentId: { bsonType: ['objectId', 'null'] },
    path: { bsonType: 'string' },
    sortOrder: integer,
  },
});
db.categories.createIndex({ slug: 1 }, { unique: true, name: 'categories_slug_unique' });
db.categories.createIndex({ path: 1 }, { name: 'categories_path' });

ensureCollection('shops', {
  bsonType: 'object',
  required: ['sellerId', 'slug', 'name', 'status'],
  properties: {
    sellerId: { bsonType: 'string' },
    slug: { bsonType: 'string', pattern: '^[a-z0-9-]+$' },
    name: { bsonType: 'string', minLength: 1 },
    description: { bsonType: ['object', 'null'] },
    status: { bsonType: 'string' },
  },
});
db.shops.createIndex({ slug: 1 }, { unique: true, name: 'shops_slug_unique' });
db.shops.createIndex({ sellerId: 1 }, { unique: true, name: 'shops_seller_unique' });

ensureCollection('products', {
  bsonType: 'object',
  required: [
    'shopId',
    'sellerId',
    'slug',
    'title',
    'description',
    'categoryId',
    'variants',
    'images',
    'status',
    'minPriceUsdCents',
    'totalStock',
    'rating',
  ],
  properties: {
    shopId: { bsonType: 'objectId' },
    sellerId: { bsonType: 'string' },
    slug: { bsonType: 'string', pattern: '^[a-z0-9-]+$' },
    title: localizedText,
    description: localizedText,
    categoryId: { bsonType: 'objectId' },
    variants: {
      bsonType: 'array',
      minItems: 1,
      items: {
        bsonType: 'object',
        required: ['sku', 'priceUsdCents', 'stock'],
        properties: {
          sku: { bsonType: 'string', minLength: 1 },
          priceUsdCents: nonNegativeInteger,
          // Stock never goes below zero: the atomic reservation relies on this.
          stock: nonNegativeInteger,
        },
      },
    },
    images: { bsonType: 'array' },
    status: { bsonType: 'string' },
    minPriceUsdCents: nonNegativeInteger,
    totalStock: nonNegativeInteger,
    rating: {
      bsonType: 'object',
      required: ['average', 'count'],
      properties: {
        average: { bsonType: ['double', 'int'], minimum: 0, maximum: 5 },
        count: nonNegativeInteger,
      },
    },
  },
});
db.products.createIndex({ slug: 1 }, { unique: true, name: 'products_slug_unique' });
db.products.createIndex(
  { 'variants.sku': 1 },
  { unique: true, name: 'products_variant_sku_unique' },
);
db.products.createIndex(
  { categoryId: 1, status: 1, minPriceUsdCents: 1 },
  { name: 'products_category_status_price' },
);
db.products.createIndex({ status: 1, publishedAt: -1 }, { name: 'products_status_newest' });
db.products.createIndex({ status: 1, 'rating.average': -1 }, { name: 'products_status_rating' });
db.products.createIndex({ shopId: 1, status: 1, createdAt: -1 }, { name: 'products_shop_status' });
db.products.createIndex({ sellerId: 1, createdAt: -1 }, { name: 'products_seller' });
// Full-text search in English and Vietnamese. MongoDB has no Vietnamese stemmer, so
// language 'none' disables stemming and stop words for both languages.
db.products.createIndex(
  { 'title.en': 'text', 'title.vi': 'text', 'description.en': 'text', 'description.vi': 'text' },
  {
    name: 'products_text',
    default_language: 'none',
    weights: { 'title.en': 10, 'title.vi': 10, 'description.en': 2, 'description.vi': 2 },
  },
);

ensureCollection('stock_reservations', {
  bsonType: 'object',
  required: ['_id', 'status', 'lines', 'releasedSellerOrderIds'],
  properties: {
    _id: { bsonType: 'string' },
    status: { bsonType: 'string' },
    lines: {
      bsonType: 'array',
      items: {
        bsonType: 'object',
        required: ['sellerOrderId', 'productId', 'variantSku', 'quantity'],
        properties: {
          sellerOrderId: { bsonType: 'string' },
          productId: { bsonType: 'string' },
          variantSku: { bsonType: 'string' },
          quantity: { bsonType: ['int', 'long'], minimum: 1 },
        },
      },
    },
    releasedSellerOrderIds: { bsonType: 'array', items: { bsonType: 'string' } },
  },
});

ensureCollection('reviews', {
  bsonType: 'object',
  required: ['productId', 'shopperId', 'rating', 'comment', 'locale', 'createdAt'],
  properties: {
    productId: { bsonType: 'objectId' },
    shopperId: { bsonType: 'string' },
    rating: { bsonType: ['int', 'long'], minimum: 1, maximum: 5 },
    comment: { bsonType: 'string', maxLength: 1000 },
    locale: { enum: ['en', 'vi'] },
    createdAt: { bsonType: 'date' },
  },
});
db.reviews.createIndex(
  { productId: 1, shopperId: 1 },
  { unique: true, name: 'reviews_one_per_shopper' },
);
db.reviews.createIndex({ productId: 1, createdAt: -1 }, { name: 'reviews_product_newest' });

ensureCollection('review_eligibility', {
  bsonType: 'object',
  required: ['_id', 'shopperId', 'productId', 'deliveredAt'],
  properties: {
    _id: { bsonType: 'string' },
    shopperId: { bsonType: 'string' },
    productId: { bsonType: 'string' },
    deliveredAt: { bsonType: 'date' },
  },
});

db.outbox.createIndex({ sentAt: 1, _id: 1 }, { name: 'outbox_unsent' });
// Kafka keeps messages 7 days, so remembering processed ids for 30 days is enough.
db.processed_events.createIndex(
  { processedAt: 1 },
  { name: 'processed_events_ttl', expireAfterSeconds: 30 * 24 * 3600 },
);

print('bazaar_catalog schema ready');
