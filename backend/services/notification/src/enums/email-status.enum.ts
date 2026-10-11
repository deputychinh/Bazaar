export enum EmailStatus {
  Pending = 'PENDING',
  Sent = 'SENT',
  /** Gave up after MAX_EMAIL_ATTEMPTS; kept for the admin to see. */
  Failed = 'FAILED',
}
