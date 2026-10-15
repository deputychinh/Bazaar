/** Page numbers shown on each side of the current page. */
export const PAGINATION_WINDOW = 2;
export const PRODUCT_IMAGE_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw';
/** Categories promoted on the home page (marketing choice; slugs from the catalog seed). */
export const FEATURED_CATEGORY_SLUGS = ['crafts', 'fashion', 'home-kitchen', 'beauty'] as const;
export const CATALOG_PAGE_SIZE = 24;
/** Above-the-fold product images loaded with priority (LCP). */
export const PRIORITY_IMAGE_COUNT = 4;
/** Product pages are cached and regenerated at most this often (ISR, seconds). */
export const PRODUCT_REVALIDATE_SECONDS = 300;
export const PRODUCT_GALLERY_SIZES = '(min-width: 1024px) 50vw, 100vw';
/** Stock at or below this shows a "only N left" hint. */
export const LOW_STOCK_THRESHOLD = 5;
export const MAX_RATING = 5;
/** Top-level categories linked under the header search box (slugs from the catalog seed). */
export const HEADER_CATEGORY_SLUGS = [
  'home-kitchen',
  'fashion',
  'crafts',
  'electronics',
  'beauty',
  'books',
] as const;
/** Home page rows. */
export const HOME_TOP_SELLERS_COUNT = 6;
export const HOME_DISCOVER_COUNT = 24;
export const PRODUCT_CARD_SIZES =
  '(min-width: 1280px) 200px, (min-width: 1024px) 17vw, (min-width: 640px) 25vw, 50vw';
/** Rating filter links in the listing sidebar ("4★ & up"…). */
export const RATING_FILTERS = [4, 3, 2] as const;
/** Product attribute keys with a translated label (messages product.attributes). */
export const TRANSLATED_ATTRIBUTES = ['origin', 'material', 'colour', 'size'] as const;
