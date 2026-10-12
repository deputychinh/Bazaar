/** One `order` server-sent event from GET /api/v1/orders/stream. */
export interface OrderStreamEvent {
  orderId: string;
  type: string;
  occurredAt: string;
}

/** A complete server-sent event: its name and data lines joined. */
export interface ParsedSse {
  event: string;
  data: string;
}
