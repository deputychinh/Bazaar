import { UserRole } from '@bazaar/contracts';
import {
  ApiZodBody,
  ApiZodResponse,
  type AuthenticatedUser,
  CurrentUser,
  Roles,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import { Body, Controller, Get, HttpStatus, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  type ShopResponse,
  shopResponseSchema,
  type UpdateShopDto,
  updateShopSchema,
} from '../dto/shop.dto.js';
import { ShopMapper } from '../mappers/shop.mapper.js';
import { ShopsService } from '../services/shops.service.js';

@ApiTags('seller')
@ApiBearerAuth()
@Roles(UserRole.Seller)
@Controller('seller/shop')
export class SellerShopController {
  public constructor(private readonly shops: ShopsService) {}

  @Get()
  @ApiZodResponse(HttpStatus.OK, shopResponseSchema)
  public async mine(@CurrentUser() seller: AuthenticatedUser): Promise<ShopResponse> {
    return ShopMapper.toResponse(await this.shops.getMine(seller.id));
  }

  @Patch()
  @ApiZodBody(updateShopSchema)
  @ApiZodResponse(HttpStatus.OK, shopResponseSchema)
  public async update(
    @CurrentUser() seller: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateShopSchema)) body: UpdateShopDto,
  ): Promise<ShopResponse> {
    return ShopMapper.toResponse(await this.shops.updateMine(seller.id, body));
  }
}
