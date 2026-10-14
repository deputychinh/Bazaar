import {
  EventFactory,
  EventType,
  type OrderCreatedPayload,
  type UnavailableLine,
} from '@bazaar/contracts';
import { CacheStore } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { ReservationStatus } from '../../../enums/reservation-status.enum.js';
import type { StockLine } from '../../../interfaces/stock.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { CacheKeyUtil } from '../../../utils/cache-key.util.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { StockRepository } from '../repositories/stock.repository.js';

/**
 * The catalog's part of the order saga (plan §5.3): reserve every line of a new order or none,
 * and give stock back when an order or a seller order is cancelled — each exactly once.
 */
@Injectable()
export class StockReservationService {
  public constructor(
    private readonly stock: StockRepository,
    private readonly outbox: EventOutbox,
    private readonly cache: CacheStore,
  ) {}

  /** OrderCreated → StockReserved, or StockRejected with nothing kept. */
  public async reserve(order: OrderCreatedPayload, transaction: Transaction): Promise<void> {
    // A reservation (or a tombstone from an earlier cancellation) already decides this order.
    if ((await this.stock.findReservation(order.orderId, transaction)) !== null) return;

    const lines: StockLine[] = order.lines.map((line) => ({
      sellerOrderId: line.sellerOrderId,
      productId: line.productId,
      variantSku: line.variantSku,
      quantity: line.quantity,
    }));
    const taken: StockLine[] = [];
    const unavailable: UnavailableLine[] = [];
    for (const line of lines) {
      if (await this.stock.tryTake(line, transaction)) {
        taken.push(line);
      } else {
        unavailable.push({
          variantSku: line.variantSku,
          requested: line.quantity,
          available: await this.stock.available(line, transaction),
        });
      }
    }

    if (unavailable.length > 0) {
      // All or nothing: put back what this order took before answering.
      for (const line of taken) await this.stock.giveBack(line, transaction);
      await this.outbox.add(
        EventFactory.create({
          type: EventType.StockRejected,
          aggregateId: order.orderId,
          payload: { orderId: order.orderId, unavailable },
        }),
        transaction,
      );
      return;
    }

    await this.stock.saveReservation(
      {
        orderId: order.orderId,
        status: ReservationStatus.Reserved,
        lines,
        releasedSellerOrderIds: [],
      },
      transaction,
    );
    await this.outbox.add(
      EventFactory.create({
        type: EventType.StockReserved,
        aggregateId: order.orderId,
        payload: { orderId: order.orderId },
      }),
      transaction,
    );
    await this.forget(lines);
  }

  /**
   * The order was paid and confirmed: its reserved units count as sold. Lines already given back
   * (a seller order cancelled first) are not counted. Runs once per event (processed-event store).
   */
  public async recordSale(orderId: string, transaction: Transaction): Promise<void> {
    const reservation = await this.stock.findReservation(orderId, transaction);
    if (reservation === null || reservation.status === ReservationStatus.Released) return;
    const released = new Set(reservation.releasedSellerOrderIds);
    for (const line of reservation.lines) {
      if (!released.has(line.sellerOrderId)) await this.stock.addSold(line, transaction);
    }
  }

  /**
   * Gives back what is still held for the order, or only for one seller order. Does nothing when
   * nothing was reserved (e.g. OUT_OF_STOCK) or it was already given back.
   */
  public async release(
    orderId: string,
    sellerOrderId: string | null,
    transaction: Transaction,
  ): Promise<void> {
    const reservation = await this.stock.findReservation(orderId, transaction);
    if (reservation === null) {
      // Cancelled before the reservation arrived (retries can reorder): block it for good.
      await this.stock.saveReservation(
        { orderId, status: ReservationStatus.Released, lines: [], releasedSellerOrderIds: [] },
        transaction,
      );
      return;
    }
    const released = new Set(reservation.releasedSellerOrderIds);
    const toRelease = reservation.lines.filter(
      (line) =>
        !released.has(line.sellerOrderId) &&
        (sellerOrderId === null || line.sellerOrderId === sellerOrderId),
    );
    if (toRelease.length === 0) return;

    for (const line of toRelease) await this.stock.giveBack(line, transaction);
    toRelease.forEach((line) => released.add(line.sellerOrderId));
    const everything = reservation.lines.every((line) => released.has(line.sellerOrderId));
    await this.stock.saveReservation(
      {
        ...reservation,
        status: everything ? ReservationStatus.Released : ReservationStatus.Reserved,
        releasedSellerOrderIds: [...released],
      },
      transaction,
    );
    await this.outbox.add(
      EventFactory.create({
        type: EventType.StockReleased,
        aggregateId: orderId,
        payload: { orderId, sellerOrderId },
      }),
      transaction,
    );
    await this.forget(toRelease);
  }

  /** Product pages show stock: drop their cached copies. */
  private async forget(lines: readonly StockLine[]): Promise<void> {
    const slugs = await this.stock.slugsOf([...new Set(lines.map((line) => line.productId))]);
    if (slugs.length > 0)
      await this.cache.delete(...slugs.map((slug) => CacheKeyUtil.productDetail(slug)));
  }
}
