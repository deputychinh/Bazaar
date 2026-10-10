import {
  type AnyEventEnvelope,
  DELIVERY_ATTEMPT_HEADER,
  EventParser,
  type EventType,
} from '@bazaar/contracts';
import type { PinoLogger } from 'nestjs-pino';

import { ERROR_HEADER, FIRST_DELIVERY_ATTEMPT } from '../constants/kafka-header.constant.js';
import type { IncomingMessage } from '../interfaces/kafka-message.interface.js';
import { PromiseUtil } from '../utils/promise.util.js';

import type { BaseEventHandler } from './base-event-handler.js';
import type { MessagePublisher } from './message-publisher.js';
import type { RetryPolicy } from './retry-policy.js';

/** Routes one consumed message to its handler; failures go to retry or dead-letter topics. */
export class EventDispatcher {
  private readonly handlers: ReadonlyMap<EventType, BaseEventHandler>;

  public constructor(
    handlers: readonly BaseEventHandler[],
    private readonly publisher: MessagePublisher,
    private readonly retryPolicy: RetryPolicy,
    private readonly logger: PinoLogger,
  ) {
    this.handlers = new Map(handlers.map((handler) => [handler.eventType, handler]));
  }

  public async dispatch(message: IncomingMessage): Promise<void> {
    const attempt = Number(message.headers[DELIVERY_ATTEMPT_HEADER] ?? FIRST_DELIVERY_ATTEMPT);
    let event: AnyEventEnvelope;
    try {
      event = EventParser.parseJson(message.value ?? '');
    } catch (error) {
      await this.forward(message, this.retryPolicy.deadLetter(message.topic, attempt), error);
      return;
    }
    const handler = this.handlers.get(event.type);
    if (handler === undefined) {
      return;
    }
    try {
      await handler.handle(event);
    } catch (error) {
      await this.forward(message, this.retryPolicy.decide(message.topic, attempt), error);
    }
  }

  private async forward(
    message: IncomingMessage,
    decision: ReturnType<RetryPolicy['decide']>,
    error: unknown,
  ): Promise<void> {
    const reason = PromiseUtil.errorMessage(error);
    this.logger.warn(
      { topic: message.topic, to: decision.topic, attempt: decision.attempt, reason },
      decision.isDeadLetter ? 'event sent to dead-letter topic' : 'event scheduled for retry',
    );
    await this.publisher.send({
      topic: decision.topic,
      key: message.key ?? '',
      value: message.value?.toString() ?? '',
      headers: {
        ...message.headers,
        [DELIVERY_ATTEMPT_HEADER]: String(decision.attempt),
        [ERROR_HEADER]: reason,
      },
    });
  }
}
