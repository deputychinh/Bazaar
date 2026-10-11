/** Redis key of the lock that keeps the sweeper on one pod at a time. */
export const ORDER_SWEEPER_LOCK_KEY = 'order:sweeper';
/** Lock lifetime; longer than one sweep, shorter than the interval between sweeps. */
export const ORDER_SWEEPER_LOCK_TTL_MS = 25_000;
/** A RESERVED order not paid after this long is charged again (a crash between steps). */
export const PAYMENT_RETRY_AFTER_MS = 60_000;
/** Orders handled per sweep and kind; the next sweep picks up the rest. */
export const ORDER_SWEEP_BATCH_SIZE = 50;
