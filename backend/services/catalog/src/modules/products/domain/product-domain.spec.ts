import { ProductStatus } from '@bazaar/contracts';
import { ValidationError } from '@bazaar/nest-common';

import { ProductAction } from '../../../enums/product-action.enum.js';
import { InvalidProductTransitionError } from '../errors/invalid-product-transition.error.js';

import { ProductRules } from './product-rules.js';
import { ProductStateMachine } from './product-state-machine.js';

const variant = (sku: string, priceUsdCents: number, stock: number) => ({
  sku,
  priceUsdCents,
  stock,
  attributes: null,
});

describe('ProductStateMachine', () => {
  it.each([
    [ProductStatus.Draft, ProductAction.Publish, ProductStatus.Published],
    [ProductStatus.Published, ProductAction.Unpublish, ProductStatus.Draft],
    [ProductStatus.Draft, ProductAction.Hide, ProductStatus.Hidden],
    [ProductStatus.Published, ProductAction.Hide, ProductStatus.Hidden],
    [ProductStatus.Hidden, ProductAction.Restore, ProductStatus.Draft],
  ])('%s + %s → %s', (from, action, to) => {
    expect(ProductStateMachine.transition(from, action)).toBe(to);
  });

  it.each([
    [ProductStatus.Published, ProductAction.Publish],
    [ProductStatus.Draft, ProductAction.Unpublish],
    [ProductStatus.Hidden, ProductAction.Publish],
    [ProductStatus.Draft, ProductAction.Restore],
  ])('refuses %s + %s', (from, action) => {
    expect(() => ProductStateMachine.transition(from, action)).toThrow(
      InvalidProductTransitionError,
    );
  });

  it('explains that hidden products need moderation to come back', () => {
    expect(() =>
      ProductStateMachine.transition(ProductStatus.Hidden, ProductAction.Publish),
    ).toThrow('hidden by moderation');
  });

  it('only published products are public', () => {
    expect(ProductStateMachine.isPublic(ProductStatus.Published)).toBe(true);
    expect(ProductStateMachine.isPublic(ProductStatus.Draft)).toBe(false);
  });
});

describe('ProductRules.summarize', () => {
  it('keeps the cheapest price and the total stock', () => {
    expect(
      ProductRules.summarize([
        variant('A-1', 1500, 2),
        variant('A-2', 900, 0),
        variant('A-3', 2000, 5),
      ]),
    ).toEqual({
      minPriceUsdCents: 900,
      totalStock: 7,
    });
  });

  it('refuses no variants and repeated SKUs', () => {
    expect(() => ProductRules.summarize([])).toThrow(ValidationError);
    expect(() => ProductRules.summarize([variant('A-1', 100, 1), variant('A-1', 200, 1)])).toThrow(
      'SKU A-1 is used twice',
    );
  });
});
