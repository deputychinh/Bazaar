/** A queued email is tried this many times before it is marked FAILED. */
export const MAX_EMAIL_ATTEMPTS = 5;
/** Emails sent per relay tick. */
export const EMAIL_RELAY_BATCH_SIZE = 20;
/** Redis lock: one pod sends at a time, so nobody gets the same email twice. */
export const EMAIL_RELAY_LOCK_KEY = 'notification:email-relay';
export const EMAIL_RELAY_LOCK_TTL_MS = 30_000;
