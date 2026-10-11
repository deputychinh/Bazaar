import { randomUUID } from 'node:crypto';

import { EventType } from '@bazaar/contracts';
import { CacheStore, ValidationError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { ObjectStorage } from '../../../common/storage/object-storage.js';
import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import {
  IMAGE_EXTENSION,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
  PRODUCT_IMAGE_PREFIX,
} from '../../../constants/image.constant.js';
import { ImageContentType } from '../../../enums/image-content-type.enum.js';
import type { Product, ProductImage } from '../../../interfaces/product.interface.js';
import type { PresignedUpload } from '../../../interfaces/storage.interface.js';
import { CacheKeyUtil } from '../../../utils/cache-key.util.js';
import { ProductStateMachine } from '../domain/product-state-machine.js';
import type { AttachImageDto, UploadRequestDto } from '../dto/product-image.dto.js';
import { ProductsRepository } from '../repositories/products.repository.js';

import { ProductEvents } from './product-events.js';
import { SellerProductsService } from './seller-products.service.js';

/** Upload straight to storage with a presigned URL, then attach after checking the file (BZ-026). */
@Injectable()
export class ProductImagesService {
  public constructor(
    private readonly sellerProducts: SellerProductsService,
    private readonly products: ProductsRepository,
    private readonly storage: ObjectStorage,
    private readonly events: ProductEvents,
    private readonly transactions: TransactionManager,
    private readonly cache: CacheStore,
  ) {}

  public async requestUpload(
    sellerId: string,
    productId: string,
    request: UploadRequestDto,
  ): Promise<PresignedUpload> {
    const product = await this.sellerProducts.get(sellerId, productId);
    ProductImagesService.assertRoomForImage(product);
    const key = `${PRODUCT_IMAGE_PREFIX}/${product.id}/${randomUUID()}.${IMAGE_EXTENSION[request.contentType]}`;
    return this.storage.presignUpload(key, request.contentType);
  }

  public async attach(
    sellerId: string,
    productId: string,
    request: AttachImageDto,
  ): Promise<Product> {
    const product = await this.sellerProducts.get(sellerId, productId);
    ProductImagesService.assertRoomForImage(product);
    if (!request.key.startsWith(`${PRODUCT_IMAGE_PREFIX}/${product.id}/`)) {
      throw new ValidationError('This image was not uploaded for this product');
    }
    const stored = await this.storage.head(request.key);
    if (stored === null) {
      throw new ValidationError('Upload the file before attaching it');
    }
    if (
      stored.sizeBytes > MAX_IMAGE_BYTES ||
      !Object.values<string>(ImageContentType).includes(stored.contentType ?? '')
    ) {
      await this.storage.delete(request.key);
      throw new ValidationError('Images must be JPEG, PNG or WebP and at most 5 MB');
    }
    return this.saveImages(product, [
      ...product.images,
      { key: request.key, alt: request.alt ?? null },
    ]);
  }

  public async remove(sellerId: string, productId: string, key: string): Promise<Product> {
    const product = await this.sellerProducts.get(sellerId, productId);
    if (!product.images.some((image) => image.key === key)) {
      throw new ValidationError('This product has no image with that key');
    }
    const updated = await this.saveImages(
      product,
      product.images.filter((image) => image.key !== key),
    );
    await this.storage.delete(key);
    return updated;
  }

  private async saveImages(product: Product, images: ProductImage[]): Promise<Product> {
    const changed = await this.transactions.run(async (transaction) => {
      const updated = await this.products.update(product.id, { images }, transaction);
      if (ProductStateMachine.isPublic(updated.status)) {
        await this.events.record(EventType.ProductUpdated, updated, transaction);
      }
      return updated;
    });
    await this.cache.delete(CacheKeyUtil.productDetail(changed.slug));
    return changed;
  }

  private static assertRoomForImage(product: Product): void {
    if (product.images.length >= MAX_IMAGES_PER_PRODUCT) {
      throw new ValidationError(`A product can have at most ${MAX_IMAGES_PER_PRODUCT} images`);
    }
  }
}
