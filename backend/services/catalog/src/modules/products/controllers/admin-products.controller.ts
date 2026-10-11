import { UserRole } from '@bazaar/contracts';
import { ApiZodBody, ApiZodResponse, Roles, ZodValidationPipe } from '@bazaar/nest-common';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { type HideProductDto, hideProductSchema } from '../dto/moderation.dto.js';
import { type SellerProduct, sellerProductSchema } from '../dto/seller-product.dto.js';
import { ProductModerationService } from '../services/product-moderation.service.js';
import { ProductPresenter } from '../services/product-presenter.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/products')
export class AdminProductsController {
  public constructor(
    private readonly moderation: ProductModerationService,
    private readonly presenter: ProductPresenter,
  ) {}

  @Get(':id')
  @ApiZodResponse(HttpStatus.OK, sellerProductSchema)
  public async get(@Param('id') id: string): Promise<SellerProduct> {
    return this.presenter.seller(await this.moderation.get(id));
  }

  @Post(':id/hide')
  @HttpCode(HttpStatus.OK)
  @ApiZodBody(hideProductSchema)
  @ApiZodResponse(HttpStatus.OK, sellerProductSchema)
  public async hide(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(hideProductSchema)) body: HideProductDto,
  ): Promise<SellerProduct> {
    return this.presenter.seller(await this.moderation.hide(id, body.reason));
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(HttpStatus.OK, sellerProductSchema)
  public async restore(@Param('id') id: string): Promise<SellerProduct> {
    return this.presenter.seller(await this.moderation.restore(id));
  }
}
