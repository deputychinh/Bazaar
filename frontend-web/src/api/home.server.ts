import 'server-only';

import { unstable_cache } from 'next/cache';

import { ProductSort } from '@/api/catalog.schema';
import {
  HOME_DISCOVER_COUNT,
  HOME_FEED_REVALIDATE_SECONDS,
  HOME_TOP_SELLERS_COUNT,
} from '@/constants/catalog.constant';
import type { HomeFeed } from '@/interfaces/home.interface';

import { listCategories, listProducts } from './catalog.server';

/** Throws when the catalog cannot answer, so a failure is never cached. */
const loadHomeFeed = async (): Promise<HomeFeed> => {
  const [topSales, discover, categories] = await Promise.all([
    listProducts({ sort: ProductSort.best_selling, pageSize: HOME_TOP_SELLERS_COUNT }),
    listProducts({ sort: ProductSort.rating, pageSize: HOME_DISCOVER_COUNT }),
    listCategories(),
  ]);
  if (topSales.data === null || discover.data === null) {
    throw new Error(`Home feed unavailable: ${topSales.errorCode ?? discover.errorCode}`);
  }
  const flat = categories.flatMap((category) => [category, ...category.children]);
  const covers = await Promise.all(
    flat.map((category) =>
      listProducts({ category: category.slug, sort: ProductSort.best_selling, pageSize: 1 }),
    ),
  );
  return {
    topSales: topSales.data.items,
    discover: discover.data.items,
    categories: flat.map((category, index) => ({
      slug: category.slug,
      name: category.name,
      imageUrl: covers[index]?.data?.items[0]?.imageUrl ?? null,
    })),
  };
};

const cachedHomeFeed = unstable_cache(loadHomeFeed, ['home-feed'], {
  revalidate: HOME_FEED_REVALIDATE_SECONDS,
});

/**
 * Rows of the home page, cached for 2 minutes and refreshed in the background. Null only when
 * the catalog is down and nothing is cached yet (the page then shows a short notice).
 */
export const getHomeFeed = async (): Promise<HomeFeed | null> => {
  try {
    return await cachedHomeFeed();
  } catch {
    return null;
  }
};
