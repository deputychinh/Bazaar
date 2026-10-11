import { z } from 'zod';

import { MAX_LINE_QUANTITY } from '@/constants/cart.constant';
import type { CartLine, CartShopGroup } from '@/interfaces/cart.interface';

import { sumUsdCents } from './money.util';

const lineSchema = z.object({
  sku: z.string().min(1),
  productSlug: z.string().min(1),
  title: z.object({ en: z.string(), vi: z.string().nullish() }),
  variantLabel: z.object({ en: z.string(), vi: z.string().nullish() }),
  imageUrl: z.string().nullable(),
  unitPriceUsdCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  maxQuantity: z.number().int().positive(),
  shop: z.object({ slug: z.string(), name: z.string() }),
});

/** Lines from localStorage; anything malformed (edited by hand, old version) is dropped. */
export const parseStoredCart = (raw: string | null): CartLine[] => {
  if (raw === null) return [];
  try {
    const result = z.array(z.unknown()).safeParse(JSON.parse(raw));
    if (!result.success) return [];
    return result.data.flatMap((item) => {
      const line = lineSchema.safeParse(item);
      return line.success ? [line.data] : [];
    });
  } catch {
    return [];
  }
};

const clampQuantity = (quantity: number, line: Pick<CartLine, 'maxQuantity'>): number =>
  Math.max(0, Math.min(Math.trunc(quantity), line.maxQuantity, MAX_LINE_QUANTITY));

/** Adds a variant, or tops up its quantity when it is already in the cart. */
export const addLine = (
  lines: readonly CartLine[],
  line: Omit<CartLine, 'quantity'>,
  quantity: number,
): CartLine[] => {
  const existing = lines.find((candidate) => candidate.sku === line.sku);
  const next = clampQuantity((existing?.quantity ?? 0) + quantity, line);
  if (next === 0) return [...lines];
  return existing === undefined
    ? [...lines, { ...line, quantity: next }]
    : lines.map((candidate) =>
        candidate.sku === line.sku ? { ...candidate, ...line, quantity: next } : candidate,
      );
};

/** Sets a line's quantity; zero removes it. */
export const setLineQuantity = (
  lines: readonly CartLine[],
  sku: string,
  quantity: number,
): CartLine[] =>
  lines.flatMap((line) => {
    if (line.sku !== sku) return [line];
    const next = clampQuantity(quantity, line);
    return next === 0 ? [] : [{ ...line, quantity: next }];
  });

export const lineTotalUsdCents = (line: CartLine): number => line.unitPriceUsdCents * line.quantity;

export const cartSubtotalUsdCents = (lines: readonly CartLine[]): number =>
  sumUsdCents(lines.map(lineTotalUsdCents));

/** Lines grouped by shop in the order shops were first added. */
export const groupByShop = (lines: readonly CartLine[]): CartShopGroup[] => {
  const groups = new Map<string, CartShopGroup>();
  lines.forEach((line) => {
    const group = groups.get(line.shop.slug) ?? { shop: line.shop, lines: [], subtotalUsdCents: 0 };
    groups.set(line.shop.slug, { ...group, lines: [...group.lines, line] });
  });
  return [...groups.values()].map((group) => ({
    ...group,
    subtotalUsdCents: cartSubtotalUsdCents(group.lines),
  }));
};
