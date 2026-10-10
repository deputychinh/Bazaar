import { DLQ_TOPIC_SUFFIX, RETRY_TOPIC_SUFFIX } from '../constants/kafka.constant';
import { Topic } from '../enums/topic.enum';

/** Names of the main, retry and dead-letter topics (plan §5.2). */
export class TopicUtil {
  public static retryTopic(topic: Topic): string {
    return `${topic}${RETRY_TOPIC_SUFFIX}`;
  }

  public static dlqTopic(topic: Topic): string {
    return `${topic}${DLQ_TOPIC_SUFFIX}`;
  }

  /** Every topic the platform needs, for topic creation scripts. */
  public static allTopicNames(): string[] {
    return Object.values(Topic).flatMap((topic) => [
      topic,
      TopicUtil.retryTopic(topic),
      TopicUtil.dlqTopic(topic),
    ]);
  }
}
