import { UserRole } from '@bazaar/contracts';
import {
  ApiZodQuery,
  ApiZodResponse,
  type AuthenticatedUser,
  CurrentUser,
  Roles,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { PlatformFigures, SellerFigures } from '../../../interfaces/stats.interface.js';
import {
  platformStatsSchema,
  sellerStatsSchema,
  type StatsQuery,
  statsQuerySchema,
} from '../dto/stats.dto.js';
import { StatsService } from '../services/stats.service.js';

@ApiTags('stats')
@ApiBearerAuth()
@Controller()
export class StatsController {
  public constructor(private readonly stats: StatsService) {}

  /** The seller's sales and orders per day, and how many parts wait to be shipped. */
  @Get('seller/stats')
  @Roles(UserRole.Seller)
  @ApiZodQuery(statsQuerySchema)
  @ApiZodResponse(HttpStatus.OK, sellerStatsSchema)
  public seller(
    @CurrentUser() seller: AuthenticatedUser,
    @Query(new ZodValidationPipe(statsQuerySchema)) query: StatsQuery,
  ): Promise<SellerFigures> {
    return this.stats.seller(seller.id, query.days);
  }

  /** Marketplace GMV per day, orders by status and the best sellers. */
  @Get('admin/stats')
  @Roles(UserRole.Admin)
  @ApiZodQuery(statsQuerySchema)
  @ApiZodResponse(HttpStatus.OK, platformStatsSchema)
  public platform(
    @Query(new ZodValidationPipe(statsQuerySchema)) query: StatsQuery,
  ): Promise<PlatformFigures> {
    return this.stats.platform(query.days);
  }
}
