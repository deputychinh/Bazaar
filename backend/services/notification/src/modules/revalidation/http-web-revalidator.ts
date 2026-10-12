import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../config/app-config.js';
import {
  REVALIDATE_SECRET_HEADER,
  REVALIDATE_TIMEOUT_MS,
} from '../../constants/revalidation.constant.js';

import { WebRevalidator } from './web-revalidator.js';

/** POST /api/revalidate on the web with the shared secret; does nothing when no secret is set. */
@Injectable()
export class HttpWebRevalidator extends WebRevalidator {
  public constructor(private readonly config: AppConfig) {
    super();
  }

  public async revalidateProduct(slug: string): Promise<void> {
    const secret = this.config.env.REVALIDATE_SECRET;
    if (secret === undefined) return;
    const response = await fetch(this.config.env.WEB_REVALIDATE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [REVALIDATE_SECRET_HEADER]: secret },
      body: JSON.stringify({ slug }),
      signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`revalidate answered ${response.status}`);
  }
}
