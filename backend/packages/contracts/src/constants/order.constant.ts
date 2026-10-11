export const RESERVATION_TIMEOUT_MINUTES = 15;
export const MAX_ITEMS_PER_ORDER = 50;
export const MAX_QUANTITY_PER_ITEM = 99;
/** Request header that makes a checkout safe to retry (one order per key and shopper). */
export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
