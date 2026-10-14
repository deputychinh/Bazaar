import { Injectable } from '@nestjs/common';

import { ImageUrlBuilder } from '../../../common/storage/image-url.builder.js';
import type { Product } from '../../../interfaces/product.interface.js';
import type { Shop } from '../../../interfaces/shop.interface.js';
import type { ProductDetail, ProductSummary } from '../dto/product.dto.js';
import type { SellerProduct } from '../dto/seller-product.dto.js';

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
    return { ...this.ownView(product), shop: { slug: shop.slug, name: shop.name } };
  }

  /** What the seller sees about their own product, including moderation notes. */
  public seller(product: Product): SellerProduct {
    return {
      ...this.ownView(product),
      // The storage key lets the seller remove an image; the public view only has its URL.
      images: product.images.map((image) => ({
        url: this.images.url(image.key),
        key: image.key,
        alt: image.alt,
      })),
      hiddenReason: product.hiddenReason,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private ownView(product: Product): Omit<ProductDetail, 'shop'> {
    return {
      ...this.summary(product),
      description: product.description,
      categoryId: product.categoryId,
      status: product.status,
      attributes: product.attributes,
      variants: product.variants,
      images: product.images.map((image) => ({ url: this.images.url(image.key), alt: image.alt })),
      publishedAt: product.publishedAt?.toISOString() ?? null,
    };
  }
}
