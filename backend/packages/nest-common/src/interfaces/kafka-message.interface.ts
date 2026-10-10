export interface OutgoingMessage {
  topic: string;
  key: string;
  value: string;
  headers: Record<string, string>;
}

export interface IncomingMessage {
  topic: string;
  key: string | null;
  value: Buffer | null;
  headers: Record<string, string>;
}

/** Where a failed message goes next (plan §5.2 retry + DLQ). */
export interface DeliveryDecision {
  topic: string;
  attempt: number;
  isDeadLetter: boolean;
}
