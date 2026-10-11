import { UserRole } from '@bazaar/contracts';
import { ApiZodBody, ApiZodResponse, ZodValidationPipe } from '@bazaar/nest-common';
import { Body, Controller, Get, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../../interfaces/authenticated-user.interface.js';
import {
  type ApplyDto,
  applySchema,
  type SellerApplicationResponse,
  sellerApplicationResponseSchema,
} from '../dto/seller-application.dto.js';
import { SellerApplicationMapper } from '../mappers/seller-application.mapper.js';
import { SellerApplicationsService } from '../services/seller-applications.service.js';

@ApiTags('sellers')
@ApiBearerAuth()
@Controller('seller-applications')
export class SellerApplicationsController {
  public constructor(private readonly service: SellerApplicationsService) {}

  @Post()
  @Roles(UserRole.Shopper)
  @ApiZodBody(applySchema)
  @ApiZodResponse(HttpStatus.CREATED, sellerApplicationResponseSchema)
  public async apply(
    @CurrentUser() caller: AuthenticatedUser,
    @Body(new ZodValidationPipe(applySchema)) body: ApplyDto,
  ): Promise<SellerApplicationResponse> {
    return SellerApplicationMapper.toResponse(await this.service.apply(caller.id, body.shopName));
  }

  @Get('mine')
  @ApiZodResponse(HttpStatus.OK, z.array(sellerApplicationResponseSchema))
  public async mine(
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<SellerApplicationResponse[]> {
    const applications = await this.service.mine(caller.id);
    return applications.map((application) => SellerApplicationMapper.toResponse(application));
  }
}
