import { ConflictError } from '@bazaar/nest-common';

/** Two checkouts raced with the same Idempotency-Key; the loser returns the winner's order. */
export class DuplicateIdempotencyKeyError extends ConflictError {}
