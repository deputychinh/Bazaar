import { ImageContentType } from '../enums/image-content-type.enum.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 8;
export const IMAGE_UPLOAD_TTL_SECONDS = 300;
export const PRODUCT_IMAGE_PREFIX = 'products';

export const IMAGE_EXTENSION: Readonly<Record<ImageContentType, string>> = {
  [ImageContentType.Jpeg]: 'jpg',
  [ImageContentType.Png]: 'png',
  [ImageContentType.Webp]: 'webp',
};
