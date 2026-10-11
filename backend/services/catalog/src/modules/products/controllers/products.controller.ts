import { ApiZodQuery, ApiZodResponse, Public, ZodValidationPipe } from '@bazaar/nest-common';
import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  type ListProductsQuery,
  listProductsQuerySchema,
  type ProductDetail,
  productDetailSchema,
  productPageSchema,
  type ProductPageResponse,
} from '../dto/product.dto.js';
import { ProductPresenter } from '../services/product-presenter.js';
import { ProductQueryService } from '../services/product-query.service.js';

@ApiTags('catalog')
@Public()
@Controller('products')
export class ProductsController {
  public constructor(
    private readonly queries: ProductQueryService,
    private readonly presenter: ProductPresenter,
  ) {}

  @Get()
  @ApiZodQuery(listProductsQuerySchema)
  @ApiZodResponse(HttpStatus.OK, productPageSchema)
  public async list(
    @Query(new ZodValidationPipe(listProductsQuerySchema)) query: ListProductsQuery,
  ): Promise<ProductPageResponse> {
    const page = await this.queries.list(query);
    return { ...page, items: page.items.map((product) => this.presenter.summary(product)) };
  }

  @Get(':slug')
  @ApiZodResponse(HttpStatus.OK, productDetailSchema)
  public bySlug(@Param('slug') slug: string): Promise<ProductDetail> {
    return this.queries.detail(slug);
  }
}
