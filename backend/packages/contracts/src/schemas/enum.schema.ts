import { z } from 'zod';

import { CancelReason } from '../enums/cancel-reason.enum.js';
import { DisplayCurrency } from '../enums/display-currency.enum.js';
import { ErrorCode } from '../enums/error-code.enum.js';
import { EventType } from '../enums/event-type.enum.js';
import { Locale } from '../enums/locale.enum.js';
import { NotificationKind } from '../enums/notification-kind.enum.js';
import { OrderStatus } from '../enums/order-status.enum.js';
import { PaymentStatus } from '../enums/payment-status.enum.js';
import { ProductStatus } from '../enums/product-status.enum.js';
import { QuoteProblem } from '../enums/quote-problem.enum.js';
import { SellerApplicationStatus } from '../enums/seller-application-status.enum.js';
import { SellerOrderStatus } from '../enums/seller-order-status.enum.js';
import { ShopStatus } from '../enums/shop-status.enum.js';
import { UserRole } from '../enums/user-role.enum.js';
import { UserStatus } from '../enums/user-status.enum.js';

// An id becomes the enum's OpenAPI component name; zod rejects registering the same id twice,
// so every API-facing enum gets exactly one schema here.
export const cancelReasonSchema = z.enum(CancelReason).meta({ id: 'CancelReason' });
export const displayCurrencySchema = z.enum(DisplayCurrency).meta({ id: 'DisplayCurrency' });
export const errorCodeSchema = z.enum(ErrorCode).meta({ id: 'ErrorCode' });
export const eventTypeSchema = z.enum(EventType).meta({ id: 'EventType' });
export const localeSchema = z.enum(Locale).meta({ id: 'Locale' });
export const notificationKindSchema = z.enum(NotificationKind).meta({ id: 'NotificationKind' });
export const orderStatusSchema = z.enum(OrderStatus).meta({ id: 'OrderStatus' });
export const paymentStatusSchema = z.enum(PaymentStatus).meta({ id: 'PaymentStatus' });
export const productStatusSchema = z.enum(ProductStatus).meta({ id: 'ProductStatus' });
export const quoteProblemSchema = z.enum(QuoteProblem).meta({ id: 'QuoteProblem' });
export const sellerApplicationStatusSchema = z
  .enum(SellerApplicationStatus)
  .meta({ id: 'SellerApplicationStatus' });
export const sellerOrderStatusSchema = z.enum(SellerOrderStatus).meta({ id: 'SellerOrderStatus' });
export const shopStatusSchema = z.enum(ShopStatus).meta({ id: 'ShopStatus' });
export const userRoleSchema = z.enum(UserRole).meta({ id: 'UserRole' });
export const userStatusSchema = z.enum(UserStatus).meta({ id: 'UserStatus' });
