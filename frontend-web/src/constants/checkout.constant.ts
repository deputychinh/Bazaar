/** Test cards of the fake payment provider (plan §2B), shown as a hint on the checkout form. */
export const TEST_CARDS = {
  success: '4242 4242 4242 4242',
  decline: '4000 0000 0000 0002',
  timeout: '4000 0000 0000 0119',
} as const;
/** How often an order page refreshes while the saga is still deciding (until SSE in P5). */
export const ORDER_POLL_INTERVAL_MS = 2_000;
/** How often the header bell refreshes its unread count. */
export const NOTIFICATION_POLL_INTERVAL_MS = 30_000;
/** Notifications shown in the bell's panel. */
export const NOTIFICATION_PANEL_SIZE = 8;
