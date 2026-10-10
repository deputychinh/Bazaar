import { RetryPolicy } from './retry-policy.js';

describe('RetryPolicy', () => {
  const policy = new RetryPolicy(3);

  it('sends a failed first delivery to the retry topic', () => {
    expect(policy.decide('order.events', 1)).toEqual({
      topic: 'order.events.retry',
      attempt: 2,
      isDeadLetter: false,
    });
  });

  it('keeps retrying from the retry topic until the limit', () => {
    expect(policy.decide('order.events.retry', 2)).toEqual({
      topic: 'order.events.retry',
      attempt: 3,
      isDeadLetter: false,
    });
  });

  it('sends the message to the dead-letter topic at the limit', () => {
    expect(policy.decide('order.events.retry', 3)).toEqual({
      topic: 'order.events.dlq',
      attempt: 3,
      isDeadLetter: true,
    });
  });

  it('finds the base topic of retry and dead-letter topics', () => {
    expect(RetryPolicy.baseTopic('catalog.events.retry')).toBe('catalog.events');
    expect(RetryPolicy.baseTopic('catalog.events.dlq')).toBe('catalog.events');
    expect(RetryPolicy.baseTopic('catalog.events')).toBe('catalog.events');
  });
});
