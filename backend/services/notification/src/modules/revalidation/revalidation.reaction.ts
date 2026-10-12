import { type AnyEventEnvelope, EventType } from '@bazaar/contracts';
import { PromiseUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import type { EventReaction } from '../../interfaces/event-reaction.interface.js';

import { WebRevalidator } from './web-revalidator.js';

const PAGE_CHANGES: ReadonlySet<EventType> = new Set([
  EventType.ProductPublished,
  EventType.ProductUpdated,
  EventType.ProductHidden,
  EventType.RatingUpdated,
]);

/**
 * Product changes and new ratings refresh the product page at once (the "web revalidate hook" of
 * plan §5.2). Best effort: a failure is logged, never fails the event — ISR refreshes within 5 min.
 */
@Injectable()
export class RevalidationReaction implements EventReaction {
  public readonly name = 'web-revalidation';

  public constructor(
    private readonly web: WebRevalidator,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RevalidationReaction.name);
  }

  public async react(event: AnyEventEnvelope): Promise<void> {
    if (!PAGE_CHANGES.has(event.type)) return;
    const { slug } = event.payload as { slug: string };
    try {
      await this.web.revalidateProduct(slug);
    } catch (error) {
      this.logger.warn(
        { slug, reason: PromiseUtil.errorMessage(error) },
        'product page not revalidated',
      );
    }
  }
}
