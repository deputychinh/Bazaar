import { QuoteProblem } from '../enums/quote-problem.enum.js';

import { quoteRequestSchema, quoteResponseSchema } from './quote.schema.js';

describe('quote schemas', () => {
  it('limits lines and quantities', () => {
    const line = { productSlug: 'lantern', variantSku: 'LAN-1', quantity: 2 };
    expect(quoteRequestSchema.safeParse({ lines: [line] }).success).toBe(true);
    expect(quoteRequestSchema.safeParse({ lines: [] }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ lines: [{ ...line, quantity: 100 }] }).success).toBe(
      false,
    );
  });

  it('tells priced and unavailable lines apart', () => {
    const parsed = quoteResponseSchema.parse({
      lines: [
        {
          productSlug: 'lantern',
          variantSku: 'LAN-1',
          quantity: 1,
          available: true,
          productId: 'p1',
          sellerId: 's1',
          shopId: 'sh1',
          shopName: 'Hội An Lights',
          title: { en: 'Lantern' },
          variantLabel: { en: 'Red', vi: 'Đỏ' },
          imageUrl: null,
          unitPriceUsdCents: 1500,
          stock: 3,
        },
        {
          productSlug: 'gone',
          variantSku: 'X',
          quantity: 1,
          available: false,
          problem: QuoteProblem.NotFound,
          stock: null,
        },
      ],
    });
    expect(parsed.lines.map((line) => line.available)).toEqual([true, false]);
  });
});
