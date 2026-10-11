import { type EventEnvelope, EventType } from '@bazaar/contracts';
import { BaseEventHandler } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import { ShopsService } from '../services/shops.service.js';

/** identity.events → SellerApproved: the new seller gets a shop (plan §3, BZ-022). */
@Injectable()
export class SellerApprovedHandler extends BaseEventHandler<EventType.SellerApproved, Transaction> {
  public readonly eventType = EventType.SellerApproved;

  public constructor(
    processedEvents: PrismaProcessedEventStore,
    private readonly shops: ShopsService,
  ) {
    super(processedEvents);
  }

  protected async process(
    event: EventEnvelope<EventType.SellerApproved>,
    transaction: Transaction,
  ): Promise<void> {
    await this.shops.provisionForSeller(event.payload, transaction);
  }
}
