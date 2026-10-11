import { CancelReason, Locale } from '@bazaar/contracts';

import { EmailKind } from '../../../enums/email-kind.enum.js';
import { HtmlUtil } from '../../../utils/html.util.js';

import { EmailTemplates } from './email-templates.js';

describe('EmailTemplates', () => {
  it('fills the order details in English, with a plain-text and an HTML body', () => {
    const mail = EmailTemplates.render(
      {
        kind: EmailKind.OrderConfirmed,
        locale: Locale.En,
        link: 'https://bazaar.test/en/orders/o1',
        orderReference: 'ABCD1234',
        amountUsdCents: 3999,
        itemCount: 3,
      },
      'linh@bazaar.test',
    );

    expect(mail).toMatchObject({ to: 'linh@bazaar.test', subject: 'Order #ABCD1234 confirmed' });
    expect(mail.text).toContain('(3 items, $39.99)');
    expect(mail.text).toContain('View my order: https://bazaar.test/en/orders/o1');
    expect(mail.html).toContain('<html lang="en">');
    expect(mail.html).toContain('href="https://bazaar.test/en/orders/o1"');
  });

  it('writes Vietnamese with the cancellation reason and USD in the Vietnamese number format', () => {
    const mail = EmailTemplates.render(
      {
        kind: EmailKind.OrderCancelled,
        locale: Locale.Vi,
        link: 'https://x',
        orderReference: 'R1',
        cancelReason: CancelReason.PaymentFailed,
      },
      'a@b.test',
    );
    expect(mail.subject).toBe('Đơn hàng #R1 đã bị huỷ');
    expect(mail.text).toContain('thanh toán không thành công. Bạn không bị trừ tiền.');

    const seller = EmailTemplates.render(
      {
        kind: EmailKind.NewSellerOrder,
        locale: Locale.Vi,
        link: 'https://x',
        orderReference: 'R2',
        amountUsdCents: 1250,
        itemCount: 1,
      },
      'a@b.test',
    );
    expect(seller.text).toMatch(/12,50\sUS\$/);
  });

  it('escapes anything inserted into HTML', () => {
    expect(HtmlUtil.escape(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
    const mail = EmailTemplates.render(
      { kind: EmailKind.ResetPassword, locale: Locale.En, link: 'https://x/?a=1&b="2"' },
      'a@b.test',
    );
    expect(mail.html).toContain('href="https://x/?a=1&amp;b=&quot;2&quot;"');
  });
});
