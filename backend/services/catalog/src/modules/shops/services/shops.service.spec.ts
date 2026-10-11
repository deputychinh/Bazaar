import { EventFactory, EventType, ShopStatus } from '@bazaar/contracts';
import { NotFoundError } from '@bazaar/nest-common';

import {
  InMemoryProcessedEvents,
  InMemoryShopsRepository,
  NO_TRANSACTION,
} from '../../../../test/fakes/catalog.fakes.js';
import { SellerApprovedHandler } from '../events/seller-approved.handler.js';

import { ShopsService } from './shops.service.js';

describe('ShopsService', () => {
  let shops: InMemoryShopsRepository;
  let service: ShopsService;

  beforeEach(() => {
    shops = new InMemoryShopsRepository();
    service = new ShopsService(shops);
  });

  it('opens an active shop with a slug from the Vietnamese name', async () => {
    const shop = await service.provisionForSeller(
      { userId: 'seller-1', applicationId: 'app-1', shopName: 'Nón Lá Huế' },
      NO_TRANSACTION,
    );

    expect(shop).toMatchObject({
      sellerId: 'seller-1',
      slug: 'non-la-hue',
      status: ShopStatus.Active,
    });
  });

  it('keeps one shop per seller and avoids slug clashes', async () => {
    await service.provisionForSeller(
      { userId: 's1', applicationId: 'a1', shopName: 'Lụa Lan' },
      NO_TRANSACTION,
    );
    await service.provisionForSeller(
      { userId: 's1', applicationId: 'a1', shopName: 'Lụa Lan' },
      NO_TRANSACTION,
    );
    const other = await service.provisionForSeller(
      { userId: 's2', applicationId: 'a2', shopName: 'Lua Lan' },
      NO_TRANSACTION,
    );

    expect(shops.rows).toHaveLength(2);
    expect(other.slug).toBe('lua-lan-2');
  });

  it('hides suspended or unknown shops from the public', async () => {
    const shop = await service.provisionForSeller(
      { userId: 's1', applicationId: 'a1', shopName: 'Shop' },
      NO_TRANSACTION,
    );
    shop.status = ShopStatus.Suspended;

    await expect(service.getPublic('shop')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getPublic('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lets a seller edit only their own shop', async () => {
    await service.provisionForSeller(
      { userId: 's1', applicationId: 'a1', shopName: 'Shop' },
      NO_TRANSACTION,
    );

    const updated = await service.updateMine('s1', {
      description: { en: 'Hand-made', vi: 'Thủ công' },
    });

    expect(updated.description).toEqual({ en: 'Hand-made', vi: 'Thủ công' });
    await expect(service.updateMine('nobody', { name: 'Taken over' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('creates the shop once even when SellerApproved is delivered twice', async () => {
    const handler = new SellerApprovedHandler(new InMemoryProcessedEvents() as never, service);
    const event = EventFactory.create({
      type: EventType.SellerApproved,
      aggregateId: 's9',
      payload: { userId: 's9', applicationId: 'a9', shopName: 'Gốm Bát Tràng' },
    });

    await handler.handle(event);
    await handler.handle(event);

    expect(shops.rows.map((shop) => shop.slug)).toEqual(['gom-bat-trang']);
  });
});
