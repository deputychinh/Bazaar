import { UserRole } from '@bazaar/contracts';
import {
  ApiZodBody,
  ApiZodQuery,
  ApiZodResponse,
  type AuthenticatedUser,
  CurrentUser,
  Public,
  Roles,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import { Body, Controller, Get, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  type CreateReviewRequest,
  createReviewSchema,
  type ListReviewsQuery,
  listReviewsQuerySchema,
  reviewEligibilitySchema,
  type ReviewEligibilityResponse,
  reviewPageSchema,
  type ReviewPageResponse,
  type ReviewResponse,
  reviewSchema,
} from '../dto/review.dto.js';
import { ReviewsService } from '../services/reviews.service.js';

@ApiTags('catalog')
@Controller('products/:slug/reviews')
export class ProductReviewsController {
  public constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get()
  @ApiZodQuery(listReviewsQuerySchema)
  @ApiZodResponse(HttpStatus.OK, reviewPageSchema)
  public list(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(listReviewsQuerySchema)) query: ListReviewsQuery,
  ): Promise<ReviewPageResponse> {
    return this.reviews.list(slug, query);
  }

  /** Whether the signed-in shopper may review this product (received it, not reviewed yet). */
  @Get('eligibility')
  @ApiBearerAuth()
  @ApiZodResponse(HttpStatus.OK, reviewEligibilitySchema)
  public eligibility(
    @CurrentUser() shopper: AuthenticatedUser,
    @Param('slug') slug: string,
  ): Promise<ReviewEligibilityResponse> {
    return this.reviews.eligibility(shopper.id, slug);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.Shopper, UserRole.Seller, UserRole.Admin)
  @ApiZodBody(createReviewSchema)
  @ApiZodResponse(HttpStatus.CREATED, reviewSchema)
  public async create(
    @CurrentUser() shopper: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(createReviewSchema)) body: CreateReviewRequest,
  ): Promise<ReviewResponse> {
    return ReviewsService.toResponse(await this.reviews.submit(shopper.id, slug, body));
  }
}
