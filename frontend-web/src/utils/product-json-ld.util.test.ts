import { Locale } from '@/api/gateway.schema';
import { productFixture } from '@/test-utils/product.fixture';

import { productJsonLd, serializeJsonLd } from './product-json-ld.util';

describe('productJsonLd', () => {
  it('describes the product in the page language with USD offers', () => {
    const data = productJsonLd({
      product: productFixture(),
      locale: Locale.vi,
      url: 'https://bazaar.test/vi/p/silk-lantern',
    });

    expect(data).toMatchObject({
      '@type': 'Product',
      name: 'Đèn lồng lụa',
      brand: { name: 'Hội An Lights' },
      aggregateRating: { ratingValue: 4.5, reviewCount: 12 },
    });
    expect(data.offers).toEqual([
      expect.objectContaining({
        price: '15.00',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      }),
      expect.objectContaining({ price: '18.00', availability: 'https://schema.org/OutOfStock' }),
    ]);
  });

  it('leaves out the rating when nobody has rated the product', () => {
    const data = productJsonLd({
      product: productFixture({ rating: { average: 0, count: 0 } }),
      locale: Locale.en,
      url: 'u',
    });
    expect(data).not.toHaveProperty('aggregateRating');
  });
});

describe('serializeJsonLd', () => {
  it('cannot be used to close the script tag', () => {
    expect(serializeJsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain('<');
  });
});
