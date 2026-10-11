import { UserRole } from '@bazaar/contracts';
import { ApiZodBody, ApiZodResponse, ZodValidationPipe } from '@bazaar/nest-common';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../../interfaces/authenticated-user.interface.js';
import {
  type ListApplicationsQuery,
  listApplicationsQuerySchema,
  type RejectDto,
  rejectSchema,
  type SellerApplicationPage,
  sellerApplicationPageSchema,
  type SellerApplicationResponse,
  sellerApplicationResponseSchema,
} from '../dto/seller-application.dto.js';
import { SellerApplicationMapper } from '../mappers/seller-application.mapper.js';
import { SellerApplicationsService } from '../services/seller-applications.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/seller-applications')
export class AdminSellerApplicationsController {
  public constructor(private readonly service: SellerApplicationsService) {}

  @Get()
  @ApiZodResponse(HttpStatus.OK, sellerApplicationPageSchema)
  public async list(
    @Query(new ZodValidationPipe(listApplicationsQuerySchema)) query: ListApplicationsQuery,
  ): Promise<SellerApplicationPage> {
    const page = await this.service.list(query);
    return {
      items: page.items.map((application) => SellerApplicationMapper.toResponse(application)),
      nextCursor: page.nextCursor,
    };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(HttpStatus.OK, sellerApplicationResponseSchema)
  public async approve(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SellerApplicationResponse> {
    return SellerApplicationMapper.toResponse(await this.service.approve(admin.id, id));
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiZodBody(rejectSchema)
  @ApiZodResponse(HttpStatus.OK, sellerApplicationResponseSchema)
  public async reject(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectSchema)) body: RejectDto,
  ): Promise<SellerApplicationResponse> {
    return SellerApplicationMapper.toResponse(await this.service.reject(admin.id, id, body.reason));
  }
}
