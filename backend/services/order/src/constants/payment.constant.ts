/** Test cards of the fake provider (plan §2B): this one is declined… */
export const TEST_CARD_DECLINE = '4000000000000002';
/** …and this one never answers, so the charge times out. */
export const TEST_CARD_TIMEOUT = '4000000000000119';
/** Longest wait for the provider before a charge counts as failed. */
export const PAYMENT_CHARGE_TIMEOUT_MS = 3_000;
export const FAKE_TOKEN_PREFIX = 'tok_fake';
/** How long the fake provider stays silent for the timeout card (longer than the timeout). */
export const FAKE_PROVIDER_HANG_MS = 10_000;
