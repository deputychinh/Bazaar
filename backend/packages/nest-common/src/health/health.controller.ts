import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';

import { HEALTH_ROUTE } from '../constants/health.constant.js';
import { HealthStatus } from '../enums/health-status.enum.js';
import { Public } from '../http/decorators/public.decorator.js';
import type { HealthReport } from '../interfaces/health-report.interface.js';

import { HealthService } from './health.service.js';

/** `/health/live` = process is running; `/health/ready` = every dependency answers (plan §9.2). */
@Public()
@Controller(HEALTH_ROUTE)
export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  @Get('live')
  public live(): { status: HealthStatus } {
    return { status: HealthStatus.Up };
  }

  @Get('ready')
  public async ready(@Res({ passthrough: true }) response: Response): Promise<HealthReport> {
    const report = await this.healthService.report();
    if (report.status === HealthStatus.Down) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return report;
  }
}
