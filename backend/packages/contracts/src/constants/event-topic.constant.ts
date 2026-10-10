import { EventType } from '../enums/event-type.enum.js';
import { Topic } from '../enums/topic.enum.js';

/** Topic each event type is published to (plan §5.2). */
export const EVENT_TOPIC: Readonly<Record<EventType, Topic>> = {
  [EventType.UserRegistered]: Topic.IdentityEvents,
  [EventType.EmailVerificationRequested]: Topic.IdentityEvents,
  [EventType.PasswordResetRequested]: Topic.IdentityEvents,
  [EventType.SellerApproved]: Topic.IdentityEvents,
  [EventType.OrderCreated]: Topic.OrderEvents,
  [EventType.OrderPaid]: Topic.OrderEvents,
  [EventType.OrderConfirmed]: Topic.OrderEvents,
  [EventType.OrderCancelled]: Topic.OrderEvents,
  [EventType.OrderCompleted]: Topic.OrderEvents,
  [EventType.SellerOrderShipped]: Topic.OrderEvents,
  [EventType.SellerOrderDelivered]: Topic.OrderEvents,
  [EventType.SellerOrderCancelled]: Topic.OrderEvents,
  [EventType.StockReserved]: Topic.InventoryEvents,
  [EventType.StockRejected]: Topic.InventoryEvents,
  [EventType.StockReleased]: Topic.InventoryEvents,
  [EventType.ProductPublished]: Topic.CatalogEvents,
  [EventType.ProductUpdated]: Topic.CatalogEvents,
  [EventType.ProductHidden]: Topic.CatalogEvents,
  [EventType.RatingUpdated]: Topic.CatalogEvents,
};
