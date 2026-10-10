import { PromiseUtil } from './promise.util.js';

describe('PromiseUtil', () => {
  it('returns the value when the promise settles in time', async () => {
    await expect(PromiseUtil.withTimeout(Promise.resolve(42), 50, 'answer')).resolves.toBe(42);
  });

  it('rejects when the promise is too slow', async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 100));

    await expect(PromiseUtil.withTimeout(slow, 10, 'database')).rejects.toThrow(
      'database timed out after 10ms',
    );
  });

  it('turns anything thrown into a message', () => {
    expect(PromiseUtil.errorMessage(new Error('boom'))).toBe('boom');
    expect(PromiseUtil.errorMessage('plain')).toBe('plain');
  });
});
