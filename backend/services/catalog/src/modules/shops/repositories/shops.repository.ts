import type { LocalizedText } from '@bazaar/contracts';

import type { NewShop, Shop } from '../../../interfaces/shop.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export interface ShopChangesOptions {
  name?: string;
  description?: LocalizedText;
}

export abstract class ShopsRepository {
  public abstract findById(id: string): Promise<Shop | null>;

  public abstract findBySlug(slug: string): Promise<Shop | null>;

  public abstract findBySellerId(sellerId: string, transaction?: Transaction): Promise<Shop | null>;

  public abstract create(shop: NewShop, transaction: Transaction): Promise<Shop>;

  public abstract update(id: string, changes: ShopChangesOptions): Promise<Shop>;
}
