import { type QuoteRequest, quoteRequestSchema, type QuoteResponse } from '@bazaar/contracts';
import { Internal, Public, ZodValidationPipe } from '@bazaar/nest-common';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { QuoteService } from '../services/quote.service.js';

/**
 * Service-to-service only (gateway checkout). Not in the public OpenAPI and never proxied; the
 * internal key replaces a user token because a quote is not about any one user.
 */
@Internal()
@Public()
@ApiExcludeController()
@Controller('internal/quote')
export class InternalQuoteController {
  public constructor(private readonly quotes: QuoteService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  public quote(
    @Body(new ZodValidationPipe(quoteRequestSchema)) body: QuoteRequest,
  ): Promise<QuoteResponse> {
    return this.quotes.quote(body);
  }
}
