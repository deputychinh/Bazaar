import 'server-only';

import { PHASE_PRODUCTION_BUILD } from 'next/constants';

import { ProductSort } from '@/api/catalog.schema';
import { serverEnv } from '@/config/env.server';
import { HOME_DISCOVER_COUNT, HOME_TOP_SELLERS_COUNT } from '@/constants/catalog.constant';
import type { HomeFeed } from '@/interfaces/home.interface';

import { listCategories, listProducts } from './catalog.server';

/**
 * Rows of the home page. Image builds have no gateway, so the build renders the page without
 * products (null) and the first visit after revalidation fills it. Later failures throw, so ISR
 * keeps serving the last good page instead of caching an empty one.
 */
export const getHomeFeed = async (): Promise<HomeFeed | null> => {
  const [topSales, discover, categories] = await Promise.all([
    listProducts({ sort: ProductSort.best_selling, pageSize: HOME_TOP_SELLERS_COUNT }),
    listProducts({ sort: ProductSort.rating, pageSize: HOME_DISCOVER_COUNT }),
    listCategories(),
  ]);
  if (topSales.data === null || discover.data === null) {
    if (serverEnv.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return null;
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
