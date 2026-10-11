import {
  type CreateOrderRequest,
  EventFactory,
  EventType,
  type OrderLine,
} from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import type { CheckoutResult } from '../../../interfaces/checkout-result.interface.js';
import type { Order } from '../../../interfaces/order.interface.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { PaymentProvider } from '../../payments/providers/payment-provider.js';
import { OrderSplitter } from '../domain/order-splitter.js';
import { DuplicateIdempotencyKeyError } from '../errors/duplicate-idempotency-key.error.js';
import { OrdersRepository } from '../repositories/orders.repository.js';

/**
 * Starts the saga (plan §5.3): Order PENDING + one SellerOrder per seller + payment intent +
 * OrderCreated, in one MySQL transaction. Retrying with the same Idempotency-Key is safe.
 */
@Injectable()
export class CheckoutService {
  public constructor(
    private readonly orders: OrdersRepository,
    private readonly payments: PaymentProvider,
    private readonly transactions: TransactionManager,
    private readonly outbox: EventOutbox,
  ) {}

  public async checkout(shopperId: string, request: CreateOrderRequest): Promise<CheckoutResult> {
    const earlier = await this.orders.findByIdempotencyKey(shopperId, request.idempotencyKey);
    if (earlier !== null) return { order: earlier, created: false };

    const card = await this.payments.tokenize(request.card);
    const sellerOrders = OrderSplitter.split(request.lines);
    try {
      const order = await this.transactions.run(async (transaction) => {
        const created = await this.orders.create(
          {
            shopperId,
            idempotencyKey: request.idempotencyKey,
            totalUsdCents: OrderSplitter.total(sellerOrders),
            sellerOrders,
            payment: { providerToken: card.token, cardLast4: card.last4 },
          },
          transaction,
        );
        await this.outbox.add(
          EventFactory.create({
            type: EventType.OrderCreated,
            aggregateId: created.id,
            payload: {
              orderId: created.id,
              shopperId,
              totalUsdCents: created.totalUsdCents,
              lines: CheckoutService.lines(created),
            },
          }),
          transaction,
        );
        return created;
      });
      return { order, created: true };
    } catch (error) {
      // A concurrent request with the same key won the insert: answer with its order.
      if (error instanceof DuplicateIdempotencyKeyError) {
        const winner = await this.orders.findByIdempotencyKey(shopperId, request.idempotencyKey);
        if (winner !== null) return { order: winner, created: false };
      }
      throw error;
    }
  }

  /** Event lines carry what the catalog needs to reserve and release stock. */
  public static lines(order: Order): OrderLine[] {
    return order.sellerOrders.flatMap((sellerOrder) =>
      sellerOrder.items.map((item) => ({
        sellerOrderId: sellerOrder.id,
        sellerId: sellerOrder.sellerId,
        productId: item.productId,
        variantSku: item.variantSku,
        quantity: item.quantity,
        unitPriceUsdCents: item.unitPriceUsdCents,
      })),
    );
  }
}
