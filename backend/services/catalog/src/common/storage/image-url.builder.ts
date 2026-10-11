import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../config/app-config.js';

/** Public URL of a stored image: <public storage URL>/<bucket>/<key>. */
@Injectable()
export class ImageUrlBuilder {
  public constructor(private readonly config: AppConfig) {}

  public url(key: string): string {
    const base = this.config.env.STORAGE_PUBLIC_URL.replace(/\/$/, '');
    return `${base}/${this.config.env.STORAGE_BUCKET_IMAGES}/${key}`;
  }
}
