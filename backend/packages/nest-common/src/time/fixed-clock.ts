import { Clock } from './clock.js';

/** Test clock: returns a fixed time that tests can move forward. */
export class FixedClock extends Clock {
  public constructor(private current: Date) {
    super();
  }

  public now(): Date {
    return new Date(this.current);
  }

  public advanceBy(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}
