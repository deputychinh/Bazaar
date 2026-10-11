import { CancelReason, OrderStatus, RESERVATION_TIMEOUT_MINUTES } from '@bazaar/contracts';
import { Clock, DistributedLock, PromiseUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import {
  ORDER_SWEEP_BATCH_SIZE,
  ORDER_SWEEPER_LOCK_KEY,
  ORDER_SWEEPER_LOCK_TTL_MS,
  PAYMENT_RETRY_AFTER_MS,
} from '../../../constants/sweeper.constant.js';
import { OrdersRepository } from '../../orders/repositories/orders.repository.js';

import { OrderSagaService } from './order-saga.service.js';
import { PaymentSettlementService } from './payment-settlement.service.js';

const MS_PER_MINUTE = 60_000;

/**
 * The saga's safety net (plan §5.3), run on one pod via a Redis lock:
 * 1. orders still PENDING/RESERVED after 15 min are cancelled (RESERVATION_TIMEOUT), releasing stock;
 * 2. RESERVED orders not settled after a minute are charged again (settle() is idempotent).
 */
@Injectable()
export class OrderSweeperService {
  public constructor(
    private readonly orders: OrdersRepository,
    private readonly saga: OrderSagaService,
    private readonly settlement: PaymentSettlementService,
    private readonly transactions: TransactionManager,
    private readonly lock: DistributedLock,
    private readonly clock: Clock,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OrderSweeperService.name);
  }

  /** False when another pod is sweeping right now. */
  public sweep(): Promise<boolean> {
    return this.lock.runExclusive(ORDER_SWEEPER_LOCK_KEY, ORDER_SWEEPER_LOCK_TTL_MS, async () => {
      await this.cancelTimedOut();
      await this.retryPayments();
    });
  }

  private async cancelTimedOut(): Promise<void> {
    const cutoff = new Date(
      this.clock.now().getTime() - RESERVATION_TIMEOUT_MINUTES * MS_PER_MINUTE,
    );
    const stale = await this.orders.findStale(
      [OrderStatus.Pending, OrderStatus.Reserved],
      cutoff,
      ORDER_SWEEP_BATCH_SIZE,
    );
    for (const order of stale) {
      const cancelled = await this.transactions.run((transaction) =>
        this.saga.cancel(order, { reason: CancelReason.ReservationTimeout }, transaction),
      );
      if (cancelled)
        this.logger.info({ orderId: order.id }, 'order cancelled: reservation timeout');
    }
  }

  private async retryPayments(): Promise<void> {
    const cutoff = new Date(this.clock.now().getTime() - PAYMENT_RETRY_AFTER_MS);
    const waiting = await this.orders.findStale(
      [OrderStatus.Reserved],
      cutoff,
      ORDER_SWEEP_BATCH_SIZE,
    );
    for (const order of waiting) {
      try {
        await this.settlement.settle(order.id);
      } catch (error) {
        // One bad order must not stop the others; the next sweep tries again.
        this.logger.error(
          { orderId: order.id, reason: PromiseUtil.errorMessage(error) },
          'payment retry failed',
        );
      }
    }
  }
}
