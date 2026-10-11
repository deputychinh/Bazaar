import { CENTS_PER_USD, Locale } from '@bazaar/contracts';

import {
  CANCEL_REASON_COPY,
  EMAIL_COPY,
  EMAIL_FOOTER,
} from '../../../constants/email-copy.constant.js';
import type { EmailContent, EmailMessage } from '../../../interfaces/email.interface.js';
import { HtmlUtil } from '../../../utils/html.util.js';

/** Turns email content into a plain-text and an HTML body in the recipient's language. */
export class EmailTemplates {
  public static render(content: EmailContent, to: string): EmailMessage {
    const copy = EMAIL_COPY[content.kind][content.locale];
    const fill = (template: string): string =>
      template
        .replaceAll('{ref}', content.orderReference ?? '')
        .replaceAll('{count}', String(content.itemCount ?? 0))
        .replaceAll('{amount}', EmailTemplates.money(content.amountUsdCents ?? 0, content.locale))
        .replaceAll(
          '{reason}',
          content.cancelReason === undefined
            ? ''
            : CANCEL_REASON_COPY[content.cancelReason][content.locale],
        );
    const subject = fill(copy.subject);
    const body = fill(copy.body);
    const footer = EMAIL_FOOTER[content.locale];
    return {
      to,
      subject,
      text: `${body}\n\n${copy.action}: ${content.link}\n\n— ${footer}\n`,
      html: [
        `<!doctype html><html lang="${content.locale}"><body style="font-family:system-ui,sans-serif;color:#1c1917">`,
        `<p>${HtmlUtil.escape(body)}</p>`,
        `<p><a href="${HtmlUtil.escape(content.link)}" style="display:inline-block;padding:10px 16px;background:#c2410c;color:#fff;border-radius:8px;text-decoration:none">${HtmlUtil.escape(copy.action)}</a></p>`,
        `<p style="color:#57534e;font-size:13px">${HtmlUtil.escape(footer)}</p>`,
        '</body></html>',
      ].join(''),
    };
  }

  /** USD in the reader's number format ("$12.50" · "12,50 US$"). */
  private static money(usdCents: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === Locale.Vi ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(usdCents / CENTS_PER_USD);
  }
}
