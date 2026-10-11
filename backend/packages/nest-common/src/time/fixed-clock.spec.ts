import { FixedClock } from './fixed-clock.js';
import { SystemClock } from './system-clock.js';

describe('clocks', () => {
  it('the fixed clock returns a copy of its time and moves forward on request', () => {
    const clock = new FixedClock(new Date('2026-10-11T00:00:00.000Z'));
    const first = clock.now();
    first.setFullYear(2000);

    clock.advanceBy(60_000);

    expect(clock.now().toISOString()).toBe('2026-10-11T00:01:00.000Z');
  });

  it('the system clock returns the current time', () => {
    const before = Date.now();

    expect(new SystemClock().now().getTime()).toBeGreaterThanOrEqual(before);
  });
});
