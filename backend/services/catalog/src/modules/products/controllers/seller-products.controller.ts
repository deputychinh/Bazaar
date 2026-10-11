import { UserRole } from '@bazaar/contracts';
import {
  ApiZodBody,
  ApiZodQuery,
  ApiZodResponse,
  type AuthenticatedUser,
  CurrentUser,
  Roles,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  type CreateProductDto,
  createProductSchema,
  type SellerProduct,
  type SellerProductPage,
  sellerProductPageSchema,
  sellerProductSchema,
  type SellerProductsQuery,
  sellerProductsQuerySchema,
  type UpdateProductDto,
  updateProductSchema,
} from '../dto/seller-product.dto.js';
import { ProductPresenter } from '../services/product-presenter.js';
import { SellerProductsService } from '../services/seller-products.service.js';

@ApiTags('seller')
@ApiBearerAuth()
@Roles(UserRole.Seller)
@Controller('seller/products')
export class SellerProductsController {
  public constructor(
    private readonly service: SellerProductsService,
    private readonly presenter: ProductPresenter,
  ) {}

  @Get()
  @ApiZodQuery(sellerProductsQuerySchema)
  @ApiZodResponse(HttpStatus.OK, sellerProductPageSchema)
  public async list(
    @CurrentUser() seller: AuthenticatedUser,
    @Query(new ZodValidationPipe(sellerProductsQuerySchema)) query: SellerProductsQuery,
  ): Promise<SellerProductPage> {
    const page = await this.service.list(seller.id, query);
    return { ...page, items: page.items.map((product) => this.presenter.seller(product)) };
  }

  @Get(':id')
  @ApiZodResponse(HttpStatus.OK, sellerProductSchema)
  public async get(
    @CurrentUser() seller: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SellerProduct> {
    return this.presenter.seller(await this.service.get(seller.id, id));
  }

  @Post()
  @ApiZodBody(createProductSchema)
  @ApiZodResponse(HttpStatus.CREATED, sellerProductSchema, 'Created as a draft')
  public async create(
    @CurrentUser() seller: AuthenticatedUser,
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductDto,
  ): Promise<SellerProduct> {
    return this.presenter.seller(await this.service.create(seller.id, body));
  }

  @Patch(':id')
  @ApiZodBody(updateProductSchema)
  @ApiZodResponse(HttpStatus.OK, sellerProductSchema)
  public async update(
    @CurrentUser() seller: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductDto,
  ): Promise<SellerProduct> {
    return this.presenter.seller(await this.service.update(seller.id, id, body));
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(HttpStatus.OK, sellerProductSchema)
  public async publish(
    @CurrentUser() seller: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SellerProduct> {
    return this.presenter.seller(await this.service.publish(seller.id, id));
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(HttpStatus.OK, sellerProductSchema)
  public async unpublish(
    @CurrentUser() seller: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SellerProduct> {
    return this.presenter.seller(await this.service.unpublish(seller.id, id));
  }
}
