import { ApiZodResponse, Public } from '@bazaar/nest-common';
import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ShopResponse, shopResponseSchema } from '../dto/shop.dto.js';
import { ShopMapper } from '../mappers/shop.mapper.js';
import { ShopsService } from '../services/shops.service.js';

@ApiTags('shops')
@Controller('shops')
export class ShopsController {
  public constructor(private readonly shops: ShopsService) {}

  @Public()
  @Get(':slug')
  @ApiZodResponse(HttpStatus.OK, shopResponseSchema)
  public async bySlug(@Param('slug') slug: string): Promise<ShopResponse> {
    return ShopMapper.toResponse(await this.shops.getPublic(slug));
  }
}
