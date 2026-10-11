import { EventType } from '@bazaar/contracts';
import { CacheStore, NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { ProductAction } from '../../../enums/product-action.enum.js';
import type { Product } from '../../../interfaces/product.interface.js';
import { CacheKeyUtil } from '../../../utils/cache-key.util.js';
import { ProductStateMachine } from '../domain/product-state-machine.js';
import { ProductsRepository } from '../repositories/products.repository.js';

import { ProductEvents } from './product-events.js';

/** Platform admins hide or restore any product (plan F9, BZ-028). */
@Injectable()
export class ProductModerationService {
  public constructor(
    private readonly products: ProductsRepository,
    private readonly events: ProductEvents,
    private readonly transactions: TransactionManager,
    private readonly cache: CacheStore,
  ) {}

  public async get(productId: string): Promise<Product> {
    const product = await this.products.findById(productId);
    if (product === null) {
      throw new NotFoundError('Product', productId);
    }
    return product;
  }

  public async hide(productId: string, reason: string): Promise<Product> {
    const product = await this.get(productId);
    const status = ProductStateMachine.transition(product.status, ProductAction.Hide);
    const wasPublic = ProductStateMachine.isPublic(product.status);
    const changed = await this.transactions.run(async (transaction) => {
      const hidden = await this.products.update(
        product.id,
        { status, hiddenReason: reason },
        transaction,
      );
      if (wasPublic) {
        await this.events.record(EventType.ProductHidden, hidden, transaction);
      }
      return hidden;
    });
    // After commit: the public page must not show stale data.
    await this.cache.delete(CacheKeyUtil.productDetail(changed.slug));
    return changed;
  }

  /** Back to draft: the seller reviews it and publishes again. */
  public async restore(productId: string): Promise<Product> {
    const product = await this.get(productId);
    const status = ProductStateMachine.transition(product.status, ProductAction.Restore);
    const changed = await this.transactions.run((transaction) =>
      this.products.update(product.id, { status, hiddenReason: null }, transaction),
    );
    // After commit: the public page must not show stale data.
    await this.cache.delete(CacheKeyUtil.productDetail(changed.slug));
    return changed;
  }
}
