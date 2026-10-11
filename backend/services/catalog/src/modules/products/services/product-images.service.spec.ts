import { EventType, ProductStatus } from '@bazaar/contracts';
import {
  FixedClock,
  InMemoryCacheStore,
  NotFoundError,
  ValidationError,
} from '@bazaar/nest-common';

import {
  FakeObjectStorage,
  ImmediateTransactionManager,
  InMemoryCategoriesRepository,
  InMemoryProductsRepository,
  InMemoryShopsRepository,
  NOW,
  productFixture,
  RecordingOutbox,
} from '../../../../test/fakes/catalog.fakes.js';
import { ImageContentType } from '../../../enums/image-content-type.enum.js';
import { CategoriesService } from '../../categories/services/categories.service.js';

import { ProductEvents } from './product-events.js';
import { ProductImagesService } from './product-images.service.js';
import { SellerProductsService } from './seller-products.service.js';

describe('ProductImagesService', () => {
  let storage: FakeObjectStorage;
  let outbox: RecordingOutbox;
  let service: ProductImagesService;

  beforeEach(() => {
    const products = new InMemoryProductsRepository([
      productFixture({ id: 'p1', images: [], status: ProductStatus.Published }),
    ]);
    const cache = new InMemoryCacheStore();
    const transactions = new ImmediateTransactionManager();
    outbox = new RecordingOutbox();
    const events = new ProductEvents(outbox);
    storage = new FakeObjectStorage();
    const sellerProducts = new SellerProductsService(
      products,
      new InMemoryShopsRepository(),
      new CategoriesService(new InMemoryCategoriesRepository(), cache),
      events,
      transactions,
      cache,
      new FixedClock(NOW),
    );
    service = new ProductImagesService(
      sellerProducts,
      products,
      storage,
      events,
      transactions,
      cache,
    );
  });

  it('signs an upload into the product folder with the right extension', async () => {
    const upload = await service.requestUpload('seller-1', 'p1', {
      contentType: ImageContentType.Webp,
      sizeBytes: 1000,
    });

    expect(upload.key).toMatch(/^products\/p1\/[0-9a-f-]{36}\.webp$/);
    expect(upload.headers).toEqual({ 'content-type': 'image/webp' });
  });

  it('attaches an uploaded image and announces the change of a public product', async () => {
    storage.objects.set('products/p1/a.webp', { sizeBytes: 2000, contentType: 'image/webp' });

    const product = await service.attach('seller-1', 'p1', {
      key: 'products/p1/a.webp',
      alt: { en: 'Front', vi: 'Mặt trước' },
    });

    expect(product.images).toEqual([
      { key: 'products/p1/a.webp', alt: { en: 'Front', vi: 'Mặt trước' } },
    ]);
    expect(outbox.events.map((event) => event.type)).toEqual([EventType.ProductUpdated]);
  });

  it('refuses files that were not uploaded, belong elsewhere, or break the rules (and deletes the bad file)', async () => {
    storage.objects.set('products/p1/huge.png', {
      sizeBytes: 6 * 1024 * 1024,
      contentType: 'image/png',
    });
    storage.objects.set('products/p1/page.html', { sizeBytes: 10, contentType: 'text/html' });

    await expect(
      service.attach('seller-1', 'p1', { key: 'products/p1/missing.jpg' }),
    ).rejects.toThrow('Upload the file');
    await expect(service.attach('seller-1', 'p1', { key: 'products/p2/a.jpg' })).rejects.toThrow(
      'not uploaded for this product',
    );
    await expect(
      service.attach('seller-1', 'p1', { key: 'products/p1/huge.png' }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.attach('seller-1', 'p1', { key: 'products/p1/page.html' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(storage.deleted).toEqual(['products/p1/huge.png', 'products/p1/page.html']);
  });

  it('removes an image from the product and the bucket', async () => {
    storage.objects.set('products/p1/a.webp', { sizeBytes: 2000, contentType: 'image/webp' });
    await service.attach('seller-1', 'p1', { key: 'products/p1/a.webp' });

    const product = await service.remove('seller-1', 'p1', 'products/p1/a.webp');

    expect(product.images).toEqual([]);
    expect(storage.deleted).toContain('products/p1/a.webp');
    await expect(service.remove('seller-1', 'p1', 'products/p1/a.webp')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('limits images per product and checks ownership', async () => {
    for (let index = 0; index < 8; index += 1) {
      storage.objects.set(`products/p1/${index}.jpg`, { sizeBytes: 10, contentType: 'image/jpeg' });
      await service.attach('seller-1', 'p1', { key: `products/p1/${index}.jpg` });
    }

    await expect(
      service.requestUpload('seller-1', 'p1', {
        contentType: ImageContentType.Jpeg,
        sizeBytes: 10,
      }),
    ).rejects.toThrow('at most 8 images');
    await expect(
      service.requestUpload('seller-2', 'p1', {
        contentType: ImageContentType.Jpeg,
        sizeBytes: 10,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
