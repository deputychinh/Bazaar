import type { EventType } from '../enums/event-type.enum.js';

import type {
  ProductChangedPayload,
  RatingUpdatedPayload,
} from './catalog-event-payloads.interface.js';
import type {
  EmailVerificationRequestedPayload,
  PasswordResetRequestedPayload,
  SellerApprovedPayload,
  UserRegisteredPayload,
} from './identity-event-payloads.interface.js';
import type {
  StockRejectedPayload,
  StockReleasedPayload,
  StockReservedPayload,
} from './inventory-event-payloads.interface.js';
import type {
  OrderCancelledPayload,
  OrderCompletedPayload,
  OrderConfirmedPayload,
  OrderCreatedPayload,
  OrderPaidPayload,
  SellerOrderCancelledPayload,
  SellerOrderDeliveredPayload,
  SellerOrderShippedPayload,
} from './order-event-payloads.interface.js';

/** Payload type of every event, keyed by its type. */
export interface EventPayloadMap {
  [EventType.UserRegistered]: UserRegisteredPayload;
  [EventType.EmailVerificationRequested]: EmailVerificationRequestedPayload;
  [EventType.PasswordResetRequested]: PasswordResetRequestedPayload;
  [EventType.SellerApproved]: SellerApprovedPayload;
  [EventType.OrderCreated]: OrderCreatedPayload;
  [EventType.OrderPaid]: OrderPaidPayload;
  [EventType.OrderConfirmed]: OrderConfirmedPayload;
  [EventType.OrderCancelled]: OrderCancelledPayload;
  [EventType.OrderCompleted]: OrderCompletedPayload;
  [EventType.SellerOrderShipped]: SellerOrderShippedPayload;
  [EventType.SellerOrderDelivered]: SellerOrderDeliveredPayload;
  [EventType.SellerOrderCancelled]: SellerOrderCancelledPayload;
  [EventType.StockReserved]: StockReservedPayload;
  [EventType.StockRejected]: StockRejectedPayload;
  [EventType.StockReleased]: StockReleasedPayload;
  [EventType.ProductPublished]: ProductChangedPayload;
  [EventType.ProductUpdated]: ProductChangedPayload;
  [EventType.ProductHidden]: ProductChangedPayload;
  [EventType.RatingUpdated]: RatingUpdatedPayload;
}

/** Message envelope on every Kafka topic (plan §5.2). */
export interface EventEnvelope<TType extends EventType = EventType> {
  eventId: string;
  type: TType;
  version: number;
  occurredAt: string;
  aggregateId: string;
  traceId: string | null;
  payload: EventPayloadMap[TType];
}

/** Union of every concrete envelope, narrowed by `type`. */
export type AnyEventEnvelope = { [TType in EventType]: EventEnvelope<TType> }[EventType];
