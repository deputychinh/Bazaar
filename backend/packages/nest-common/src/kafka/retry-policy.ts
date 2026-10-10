import { DLQ_TOPIC_SUFFIX, RETRY_TOPIC_SUFFIX } from '@bazaar/contracts';

import type { DeliveryDecision } from '../interfaces/kafka-message.interface.js';

/** Decides where a failed message goes: `<topic>.retry` until the limit, then `<topic>.dlq`. */
export class RetryPolicy {
  public constructor(private readonly maxAttempts: number) {}

  public static baseTopic(topic: string): string {
    for (const suffix of [RETRY_TOPIC_SUFFIX, DLQ_TOPIC_SUFFIX]) {
      if (topic.endsWith(suffix)) {
        return topic.slice(0, -suffix.length);
      }
    }
    return topic;
  }

  /** `attempt` is how many times the message has been delivered so far (first delivery = 1). */
  public decide(topic: string, attempt: number): DeliveryDecision {
    if (attempt >= this.maxAttempts) {
      return this.deadLetter(topic, attempt);
    }
    return {
      topic: `${RetryPolicy.baseTopic(topic)}${RETRY_TOPIC_SUFFIX}`,
      attempt: attempt + 1,
      isDeadLetter: false,
    };
  }

  /** Messages that can never succeed (e.g. invalid contract) skip retries. */
  public deadLetter(topic: string, attempt: number): DeliveryDecision {
    return {
      topic: `${RetryPolicy.baseTopic(topic)}${DLQ_TOPIC_SUFFIX}`,
      attempt,
      isDeadLetter: true,
    };
  }
}
