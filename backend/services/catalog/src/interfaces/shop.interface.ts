import type { LocalizedText, ShopStatus } from '@bazaar/contracts';

export interface Shop {
  id: string;
  sellerId: string;
  slug: string;
  name: string;
  description: LocalizedText | null;
  status: ShopStatus;
  createdAt: Date;
}

export interface NewShop {
  sellerId: string;
  slug: string;
  name: string;
  status: ShopStatus;
}
