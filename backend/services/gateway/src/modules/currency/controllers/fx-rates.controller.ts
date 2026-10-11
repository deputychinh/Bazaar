import { ApiZodResponse, Public } from '@bazaar/nest-common';
import { Controller, Get, Header, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { FX_HTTP_MAX_AGE_SECONDS } from '../../../constants/currency.constant.js';
import type { FxRates } from '../../../interfaces/fx-rates.interface.js';
import { fxRatesResponseSchema } from '../dto/fx-rates.dto.js';
import { FxRateService } from '../services/fx-rate.service.js';

@ApiTags('currency')
@Controller('fx-rates')
export class FxRatesController {
  public constructor(private readonly fx: FxRateService) {}

  @Public()
  @Get()
  @Header('Cache-Control', `public, max-age=${FX_HTTP_MAX_AGE_SECONDS}`)
  @ApiZodResponse(
    HttpStatus.OK,
    fxRatesResponseSchema,
    'Display rates; amounts are always charged in USD',
  )
  public current(): Promise<FxRates> {
    return this.fx.current();
  }
}
