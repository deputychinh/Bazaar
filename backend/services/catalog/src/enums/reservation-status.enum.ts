export enum ReservationStatus {
  /** Some or all lines are still held. */
  Reserved = 'RESERVED',
  /** Everything was given back (or the order was cancelled before any reservation). */
  Released = 'RELEASED',
}
