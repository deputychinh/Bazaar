/** Versioned so a future shape change can ignore old carts instead of crashing on them. */
export const CART_STORAGE_KEY = 'bazaar_cart_v2';
/** Per-line ceiling regardless of stock (anti-hoarding; plan §4 business rules). */
export const MAX_LINE_QUANTITY = 10;
