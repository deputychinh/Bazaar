import {
  ProductStatus,
  QuoteProblem,
  type QuoteLine,
  type QuoteLineRequest,
  type QuoteRequest,
  type QuoteResponse,
} from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import { ImageUrlBuilder } from '../../../common/storage/image-url.builder.js';
import type { Product } from '../../../interfaces/product.interface.js';
import type { Shop } from '../../../interfaces/shop.interface.js';
import { VariantLabelUtil } from '../../../utils/variant-label.util.js';
import { ProductsRepository } from '../../products/repositories/products.repository.js';
import { ShopsRepository } from '../../shops/repositories/shops.repository.js';

/**
 * Prices cart lines with the catalog's current data for checkout. Read-only and advisory for
 * stock: the reservation (OrderCreated → conditional decrement) is what actually holds units.
 */
@Injectable()
export class QuoteService {
  public constructor(
    private readonly products: ProductsRepository,
    private readonly shops: ShopsRepository,
    private readonly images: ImageUrlBuilder,
  ) {}

  public async quote(request: QuoteRequest): Promise<QuoteResponse> {
    const slugs = [...new Set(request.lines.map((line) => line.productSlug))];
    const products = new Map((await this.products.findBySlugs(slugs)).map((p) => [p.slug, p]));
    const shopIds = [...new Set([...products.values()].map((product) => product.shopId))];
    const shops = new Map(
      (await Promise.all(shopIds.map((id) => this.shops.findById(id))))
        .filter((shop): shop is Shop => shop !== null)
        .map((shop) => [shop.id, shop]),
    );
    return {
      lines: request.lines.map((line) =>
        this.priceLine(line, products.get(line.productSlug), shops),
      ),
    };
  }

  private priceLine(
    line: QuoteLineRequest,
    product: Product | undefined,
    shops: Map<string, Shop>,
  ): QuoteLine {
    const variant = product?.variants.find((candidate) => candidate.sku === line.variantSku);
    const shop = product === undefined ? undefined : shops.get(product.shopId);
    if (product === undefined || variant === undefined || shop === undefined) {
      return { ...line, available: false, problem: QuoteProblem.NotFound, stock: null };
    }
    if (product.status !== ProductStatus.Published) {
      return { ...line, available: false, problem: QuoteProblem.NotPublished, stock: null };
    }
    if (variant.stock < line.quantity) {
      return {
        ...line,
        available: false,
        problem: QuoteProblem.InsufficientStock,
        stock: variant.stock,
      };
    }
    const image = product.images[0];
    return {
      ...line,
      available: true,
      productId: product.id,
      sellerId: product.sellerId,
      shopId: shop.id,
      shopName: shop.name,
      title: product.title,
      variantLabel: VariantLabelUtil.of(variant),
      imageUrl: image === undefined ? null : this.images.url(image.key),
      unitPriceUsdCents: variant.priceUsdCents,
      stock: variant.stock,
    };
  }
}
