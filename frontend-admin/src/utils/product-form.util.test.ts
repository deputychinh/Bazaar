import { sellerProductFixture } from '@/test-utils/product.fixture';

import { emptyProductForm, formToRequest, productToForm } from './product-form.util';

describe('product form mapping', () => {
  it('turns a product into form values and back without loss', () => {
    const values = productToForm(sellerProductFixture());
    expect(values.variants[0]).toEqual({
      sku: 'LAN-RED',
      price: '15.00',
      stock: 4,
      colourEn: 'Red',
      colourVi: 'Đỏ',
    });

    expect(formToRequest(values)).toEqual({
      title: { en: 'Silk lantern', vi: 'Đèn lồng lụa' },
      description: { en: 'Made by hand in Hội An.', vi: 'Làm thủ công ở Hội An.' },
      categoryId: 'ca0000000000000000000002',
      attributes: null,
      variants: [
        {
          sku: 'LAN-RED',
          priceUsdCents: 1500,
          stock: 4,
          attributes: { colour: { en: 'Red', vi: 'Đỏ' } },
        },
      ],
    });
  });

  it('leaves out empty Vietnamese text and empty colours, upper-cases SKUs', () => {
    const request = formToRequest({
      ...emptyProductForm(),
      titleEn: ' Vase ',
      descriptionEn: 'A long enough description',
      variants: [{ sku: 'vase-1', price: '9,99', stock: 2, colourEn: '', colourVi: '' }],
    });
    expect(request.title).toEqual({ en: 'Vase', vi: undefined });
    expect(request.variants[0]).toEqual({
      sku: 'VASE-1',
      priceUsdCents: 999,
      stock: 2,
      attributes: null,
    });
  });

  it('reads colours that are missing or plain', () => {
    const plain = productToForm(
      sellerProductFixture({
        variants: [{ sku: 'A-1', priceUsdCents: 100, stock: 0, attributes: { colour: 'Blue' } }],
      }),
    );
    expect(plain.variants[0]).toMatchObject({ colourEn: '', colourVi: '' });
  });
});
