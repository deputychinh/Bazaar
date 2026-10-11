import type { Locale } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../../config/app-config.js';

/** Links sent by email point to the customer site in the user's language. */
@Injectable()
export class AuthLinkBuilder {
  public constructor(private readonly config: AppConfig) {}

  public verifyEmail(locale: Locale, token: string): string {
    return this.build(locale, 'verify-email', token);
  }

  public resetPassword(locale: Locale, token: string): string {
    return this.build(locale, 'reset-password', token);
  }

  private build(locale: Locale, page: string, token: string): string {
    const url = new URL(`/${locale}/${page}`, this.config.env.WEB_APP_URL);
    url.searchParams.set('token', token);
    return url.toString();
  }
}
