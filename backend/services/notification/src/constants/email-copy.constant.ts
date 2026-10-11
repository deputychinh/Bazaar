import { CancelReason, Locale } from '@bazaar/contracts';

import { EmailKind } from '../enums/email-kind.enum.js';
import type { EmailCopy } from '../interfaces/email.interface.js';

/** Every email in English and Vietnamese (plan FR-12). Amounts are always USD (plan §2B). */
export const EMAIL_COPY: Readonly<Record<EmailKind, Readonly<Record<Locale, EmailCopy>>>> = {
  [EmailKind.VerifyEmail]: {
    [Locale.En]: {
      subject: 'Confirm your email for Bazaar',
      body: 'Welcome to Bazaar! Please confirm your email address. The link is valid for 24 hours.',
      action: 'Confirm my email',
    },
    [Locale.Vi]: {
      subject: 'Xác nhận email của bạn trên Bazaar',
      body: 'Chào mừng bạn đến với Bazaar! Vui lòng xác nhận địa chỉ email. Liên kết có hiệu lực trong 24 giờ.',
      action: 'Xác nhận email',
    },
  },
  [EmailKind.ResetPassword]: {
    [Locale.En]: {
      subject: 'Reset your Bazaar password',
      body: 'Someone asked to reset your password. If it was you, choose a new one within 1 hour. If not, ignore this email.',
      action: 'Choose a new password',
    },
    [Locale.Vi]: {
      subject: 'Đặt lại mật khẩu Bazaar',
      body: 'Có người yêu cầu đặt lại mật khẩu của bạn. Nếu đó là bạn, hãy chọn mật khẩu mới trong vòng 1 giờ. Nếu không, hãy bỏ qua email này.',
      action: 'Chọn mật khẩu mới',
    },
  },
  [EmailKind.OrderConfirmed]: {
    [Locale.En]: {
      subject: 'Order #{ref} confirmed',
      body: 'Thank you! Your order #{ref} ({count} items, {amount}) is confirmed. The shops are preparing it.',
      action: 'View my order',
    },
    [Locale.Vi]: {
      subject: 'Đơn hàng #{ref} đã được xác nhận',
      body: 'Cảm ơn bạn! Đơn hàng #{ref} ({count} sản phẩm, {amount}) đã được xác nhận. Các shop đang chuẩn bị hàng.',
      action: 'Xem đơn hàng',
    },
  },
  [EmailKind.OrderCancelled]: {
    [Locale.En]: {
      subject: 'Order #{ref} cancelled',
      body: 'Your order #{ref} was cancelled: {reason}',
      action: 'View my order',
    },
    [Locale.Vi]: {
      subject: 'Đơn hàng #{ref} đã bị huỷ',
      body: 'Đơn hàng #{ref} của bạn đã bị huỷ: {reason}',
      action: 'Xem đơn hàng',
    },
  },
  [EmailKind.SellerOrderShipped]: {
    [Locale.En]: {
      subject: 'Part of order #{ref} is on its way',
      body: 'Good news: a shop has shipped part of your order #{ref}.',
      action: 'Track my order',
    },
    [Locale.Vi]: {
      subject: 'Một phần đơn hàng #{ref} đang được giao',
      body: 'Tin vui: một shop đã gửi hàng cho một phần đơn hàng #{ref} của bạn.',
      action: 'Theo dõi đơn hàng',
    },
  },
  [EmailKind.SellerOrderDelivered]: {
    [Locale.En]: {
      subject: 'Delivered: part of order #{ref}',
      body: 'Part of your order #{ref} was delivered. Enjoy it — and tell others what you think with a review.',
      action: 'Review my purchase',
    },
    [Locale.Vi]: {
      subject: 'Đã giao: một phần đơn hàng #{ref}',
      body: 'Một phần đơn hàng #{ref} đã được giao. Chúc bạn hài lòng — hãy chia sẻ cảm nhận bằng một đánh giá.',
      action: 'Đánh giá sản phẩm',
    },
  },
  [EmailKind.NewSellerOrder]: {
    [Locale.En]: {
      subject: 'New order #{ref} to fulfil',
      body: 'You have a new paid order #{ref}: {count} items, {amount}. Please ship it soon.',
      action: 'Open my orders',
    },
    [Locale.Vi]: {
      subject: 'Đơn hàng mới #{ref} cần xử lý',
      body: 'Bạn có đơn hàng mới đã thanh toán #{ref}: {count} sản phẩm, {amount}. Vui lòng gửi hàng sớm.',
      action: 'Mở danh sách đơn',
    },
  },
};

/** Why an order was cancelled, as the shopper reads it. */
export const CANCEL_REASON_COPY: Readonly<Record<CancelReason, Readonly<Record<Locale, string>>>> =
  {
    [CancelReason.OutOfStock]: {
      [Locale.En]: 'some items sold out before we could reserve them. You were not charged.',
      [Locale.Vi]: 'một số sản phẩm đã hết trước khi kịp giữ. Bạn không bị trừ tiền.',
    },
    [CancelReason.PaymentFailed]: {
      [Locale.En]: 'the payment did not go through. You were not charged.',
      [Locale.Vi]: 'thanh toán không thành công. Bạn không bị trừ tiền.',
    },
    [CancelReason.ReservationTimeout]: {
      [Locale.En]: 'it could not be completed in time. You were not charged.',
      [Locale.Vi]: 'đơn không thể hoàn tất kịp thời. Bạn không bị trừ tiền.',
    },
    [CancelReason.ShopperCancelled]: {
      [Locale.En]: 'you cancelled it. Any amount paid will be refunded.',
      [Locale.Vi]: 'bạn đã huỷ đơn. Số tiền đã trả sẽ được hoàn lại.',
    },
  };

export const EMAIL_FOOTER: Readonly<Record<Locale, string>> = {
  [Locale.En]: 'Bazaar — handmade goods from Vietnamese makers. Amounts are charged in USD.',
  [Locale.Vi]: 'Bazaar — đồ thủ công từ các nhà làm Việt Nam. Số tiền được tính bằng USD.',
};
