import { PRODUCT_DETAIL_CACHE_PREFIX } from '../constants/cache.constant.js';

export class CacheKeyUtil {
  public static productDetail(slug: string): string {
    return `${PRODUCT_DETAIL_CACHE_PREFIX}:${slug}`;
  }
}
