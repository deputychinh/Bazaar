import { EventType } from '@bazaar/contracts';
import { NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { ProductAction } from '../../../enums/product-action.enum.js';
import type { Product } from '../../../interfaces/product.interface.js';
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
    return this.transactions.run(async (transaction) => {
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
  }

  /** Back to draft: the seller reviews it and publishes again. */
  public async restore(productId: string): Promise<Product> {
    const product = await this.get(productId);
    const status = ProductStateMachine.transition(product.status, ProductAction.Restore);
    return this.transactions.run((transaction) =>
      this.products.update(product.id, { status, hiddenReason: null }, transaction),
    );
  }
}
