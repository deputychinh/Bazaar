import { Injectable } from '@nestjs/common';

import { ImageUrlBuilder } from '../../../common/storage/image-url.builder.js';
import type { Product } from '../../../interfaces/product.interface.js';
import type { Shop } from '../../../interfaces/shop.interface.js';
import type { ProductDetail, ProductSummary } from '../dto/product.dto.js';

/** Public shapes of a product; never exposes seller ids or moderation notes. */
@Injectable()
export class ProductPresenter {
  public constructor(private readonly images: ImageUrlBuilder) {}

  public summary(product: Product): ProductSummary {
    const firstImage = product.images[0];
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      minPriceUsdCents: product.minPriceUsdCents,
      imageUrl: firstImage === undefined ? null : this.images.url(firstImage.key),
      rating: product.rating,
      inStock: product.totalStock > 0,
    };
  }

  public detail(product: Product, shop: Shop): ProductDetail {
    return {
      ...this.summary(product),
      description: product.description,
      categoryId: product.categoryId,
      status: product.status,
      attributes: product.attributes,
      variants: product.variants,
      images: product.images.map((image) => ({ url: this.images.url(image.key), alt: image.alt })),
      shop: { slug: shop.slug, name: shop.name },
      publishedAt: product.publishedAt?.toISOString() ?? null,
    };
  }
}
