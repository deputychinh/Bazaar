import { ShopStatus } from '@bazaar/contracts';

import type { Shop as ShopRow } from '#prisma';

import { ShopMapper } from './shop.mapper.js';

const row: ShopRow = {
  id: '5b0000000000000000000001',
  sellerId: 'seller-1',
  slug: 'lua-lan',
  name: 'Lụa Lan',
  description: { en: 'Silk woven in Hà Đông.', vi: null },
  status: 'ACTIVE',
  createdAt: new Date('2026-10-01T08:00:00.000Z'),
  updatedAt: new Date('2026-10-01T08:00:00.000Z'),
};

describe('ShopMapper', () => {
  it('maps a stored shop, dropping a missing Vietnamese text', () => {
    expect(ShopMapper.toDomain(row)).toMatchObject({
      slug: 'lua-lan',
      status: ShopStatus.Active,
      description: { en: 'Silk woven in Hà Đông.', vi: undefined },
    });
  });

  it('keeps an empty description empty and hides the seller id in responses', () => {
    const shop = ShopMapper.toDomain({ ...row, description: null });

    expect(shop.description).toBeNull();
    expect(ShopMapper.toResponse(shop)).toEqual({
      id: row.id,
      slug: 'lua-lan',
      name: 'Lụa Lan',
      description: null,
      status: ShopStatus.Active,
      createdAt: '2026-10-01T08:00:00.000Z',
    });
  });

  it('refuses a status outside the contract enum', () => {
    expect(() => ShopMapper.toDomain({ ...row, status: 'CLOSED' })).toThrow('Unknown enum value');
  });
});
