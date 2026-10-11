import { UserRole } from '@bazaar/contracts';
import {
  ApiZodBody,
  ApiZodResponse,
  type AuthenticatedUser,
  CurrentUser,
  Roles,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { PresignedUpload } from '../../../interfaces/storage.interface.js';
import {
  type AttachImageDto,
  attachImageSchema,
  type RemoveImageQuery,
  removeImageQuerySchema,
  type UploadRequestDto,
  uploadRequestSchema,
  uploadResponseSchema,
} from '../dto/product-image.dto.js';
import { type SellerProduct, sellerProductSchema } from '../dto/seller-product.dto.js';
import { ProductImagesService } from '../services/product-images.service.js';
import { ProductPresenter } from '../services/product-presenter.js';

@ApiTags('seller')
@ApiBearerAuth()
@Roles(UserRole.Seller)
@Controller('seller/products/:id/images')
export class SellerProductImagesController {
  public constructor(
    private readonly images: ProductImagesService,
    private readonly presenter: ProductPresenter,
  ) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiZodBody(uploadRequestSchema)
  @ApiZodResponse(
    HttpStatus.OK,
    uploadResponseSchema,
    'PUT the file to uploadUrl with these headers',
  )
  public requestUpload(
    @CurrentUser() seller: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(uploadRequestSchema)) body: UploadRequestDto,
  ): Promise<PresignedUpload> {
    return this.images.requestUpload(seller.id, id, body);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiZodBody(attachImageSchema)
  @ApiZodResponse(HttpStatus.OK, sellerProductSchema)
  public async attach(
    @CurrentUser() seller: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(attachImageSchema)) body: AttachImageDto,
  ): Promise<SellerProduct> {
    return this.presenter.seller(await this.images.attach(seller.id, id, body));
  }

  @Delete()
  @ApiZodResponse(HttpStatus.OK, sellerProductSchema)
  public async remove(
    @CurrentUser() seller: AuthenticatedUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(removeImageQuerySchema)) query: RemoveImageQuery,
  ): Promise<SellerProduct> {
    return this.presenter.seller(await this.images.remove(seller.id, id, query.key));
  }
}
