import { EventType, ProductStatus } from '@bazaar/contracts';
import { NotFoundError } from '@bazaar/nest-common';

import {
  ImmediateTransactionManager,
  InMemoryProductsRepository,
  productFixture,
  RecordingOutbox,
} from '../../../../test/fakes/catalog.fakes.js';
import { InvalidProductTransitionError } from '../errors/invalid-product-transition.error.js';

import { ProductEvents } from './product-events.js';
import { ProductModerationService } from './product-moderation.service.js';

describe('ProductModerationService', () => {
  let products: InMemoryProductsRepository;
  let outbox: RecordingOutbox;
  let service: ProductModerationService;

  beforeEach(() => {
    products = new InMemoryProductsRepository([
      productFixture({ id: 'live', status: ProductStatus.Published }),
      productFixture({
        id: 'draft',
        slug: 'draft',
        status: ProductStatus.Draft,
        variants: [{ sku: 'D-1', priceUsdCents: 1, stock: 1, attributes: null }],
      }),
    ]);
    outbox = new RecordingOutbox();
    service = new ProductModerationService(
      products,
      new ProductEvents(outbox),
      new ImmediateTransactionManager(),
    );
  });

  it('hides a public product with a reason and tells the platform', async () => {
    const hidden = await service.hide('live', 'Counterfeit brand');

    expect(hidden).toMatchObject({
      status: ProductStatus.Hidden,
      hiddenReason: 'Counterfeit brand',
    });
    expect(outbox.events.map((event) => event.type)).toEqual([EventType.ProductHidden]);
  });

  it('hides a draft quietly and restores it to draft without the reason', async () => {
    await service.hide('draft', 'Prohibited item');
    const restored = await service.restore('draft');

    expect(outbox.events).toEqual([]);
    expect(restored).toMatchObject({ status: ProductStatus.Draft, hiddenReason: null });
  });

  it('refuses restoring a visible product and unknown ids', async () => {
    await expect(service.restore('live')).rejects.toBeInstanceOf(InvalidProductTransitionError);
    await expect(service.hide('missing', 'reason')).rejects.toBeInstanceOf(NotFoundError);
  });
});
