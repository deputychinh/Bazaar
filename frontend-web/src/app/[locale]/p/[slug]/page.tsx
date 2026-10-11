import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { getProduct, listCategories } from '@/api/catalog.server';
import { serverEnv } from '@/config/env.server';
import { ProductView } from '@/features/product/components/ProductView';
import { pageLocale } from '@/i18n/page-locale';
import type { Category } from '@/interfaces/catalog.interface';
import { localizedAlternates } from '@/utils/alternates.util';
import { pickLocalized } from '@/utils/localized-text.util';
import { productJsonLd, serializeJsonLd } from '@/utils/product-json-ld.util';

/**
 * ISR (plan §6.2): each product page is rendered on its first visit, served from cache, and
 * regenerated in the background at most every 5 minutes — or at once through /api/revalidate
 * when a seller edits it. Must be a literal: Next reads it at build time.
 */
export const revalidate = 300;

/** No product is prerendered at build (the build must not need the API); all render on demand. */
export const generateStaticParams = (): { slug: string }[] => [];

const findCategory = (categories: readonly Category[], id: string): Category | undefined =>
  categories.flatMap((category) => [category, ...category.children]).find((c) => c.id === id);

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/p/[slug]'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const { slug } = await params;
  const product = await getProduct(slug);
  if (product === null) return {};
  const title = pickLocalized(product.title, locale);
  const description = pickLocalized(product.description, locale);
  return {
    title,
    description,
    alternates: localizedAlternates(locale, `/p/${slug}`),
    openGraph: { title, description, images: product.images.slice(0, 1).map((image) => image.url) },
  };
};

const ProductPage = async ({ params }: PageProps<'/[locale]/p/[slug]'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const { slug } = await params;
  const [product, categories] = await Promise.all([getProduct(slug), listCategories()]);
  if (product === null) notFound();
  const jsonLd = productJsonLd({
    product,
    locale,
    url: `${serverEnv.SITE_URL}/${locale}/p/${slug}`,
  });
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- escaped JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ProductView product={product} category={findCategory(categories, product.categoryId)} />
    </>
  );
};

export default ProductPage;
