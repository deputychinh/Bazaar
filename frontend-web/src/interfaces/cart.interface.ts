import type { LocalizedText } from './localized-text.interface';

/**
 * One variant in the cart. Title, image and price are a snapshot for display only: the order
 * service reprices every line at checkout, so a stale price can never be charged.
 */
export interface CartLine {
  sku: string;
  productSlug: string;
  title: LocalizedText;
  variantLabel: string;
  imageUrl: string | null;
  unitPriceUsdCents: number;
  quantity: number;
  /** Stock when the line was added; caps the quantity stepper. */
  maxQuantity: number;
  shop: { slug: string; name: string };
}

/** Lines of one shop — each becomes its own seller order at checkout. */
export interface CartShopGroup {
  shop: CartLine['shop'];
  lines: CartLine[];
  subtotalUsdCents: number;
}

export interface CartContextValue {
  lines: readonly CartLine[];
  /** Number of items (sum of quantities), shown on the header badge. */
  count: number;
  subtotalUsdCents: number;
  /** False during server render and hydration, before localStorage has been read. */
  isReady: boolean;
  add: (line: Omit<CartLine, 'quantity'>, quantity: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
}

/** Product fields a cart line copies; the variant supplies SKU, price and stock. */
export type CartProduct = Pick<CartLine, 'productSlug' | 'title' | 'imageUrl' | 'shop'>;
