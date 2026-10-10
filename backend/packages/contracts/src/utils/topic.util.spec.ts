import { Topic } from '../enums/topic.enum.js';

import { TopicUtil } from './topic.util.js';

describe('TopicUtil', () => {
  it('names the retry and dead-letter topics', () => {
    expect(TopicUtil.retryTopic(Topic.OrderEvents)).toBe('order.events.retry');
    expect(TopicUtil.dlqTopic(Topic.OrderEvents)).toBe('order.events.dlq');
  });

  it('lists main, retry and dead-letter topics for every topic', () => {
    const names = TopicUtil.allTopicNames();

    expect(names).toHaveLength(Object.values(Topic).length * 3);
    expect(names).toContain('catalog.events.dlq');
  });
});
