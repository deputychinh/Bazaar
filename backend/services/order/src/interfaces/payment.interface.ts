/** What the provider returns for a card: a reusable token, never the number. */
export interface TokenizedCard {
  token: string;
  last4: string;
}

export interface ChargeRequest {
  token: string;
  amountUsdCents: number;
  /** Our order id; the provider uses it to make a retried charge idempotent. */
  reference: string;
}

export type ChargeResult =
  { succeeded: true; providerRef: string } | { succeeded: false; failureReason: string };
