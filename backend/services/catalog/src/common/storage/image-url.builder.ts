import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../config/app-config.js';

/**
 * Public URL of a stored image: <image CDN>/<key> when a CDN serves the bucket (AWS), otherwise
 * <public storage URL>/<bucket>/<key> (RustFS locally).
 */
@Injectable()
export class ImageUrlBuilder {
  public constructor(private readonly config: AppConfig) {}

  public url(key: string): string {
    const {
      STORAGE_IMAGE_BASE_URL: cdn,
      STORAGE_PUBLIC_URL,
      STORAGE_BUCKET_IMAGES,
    } = this.config.env;
    const base =
      cdn === undefined ? `${STORAGE_PUBLIC_URL.replace(/\/$/, '')}/${STORAGE_BUCKET_IMAGES}` : cdn;
    return `${base.replace(/\/$/, '')}/${key}`;
  }
}
