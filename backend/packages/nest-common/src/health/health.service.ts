import { Inject, Injectable } from '@nestjs/common';

import { HEALTH_CHECK_TIMEOUT_MS } from '../constants/health.constant.js';
import { HEALTH_INDICATORS } from '../constants/injection-token.constant.js';
import { HealthStatus } from '../enums/health-status.enum.js';
import type { HealthCheckResult, HealthReport } from '../interfaces/health-report.interface.js';
import { PromiseUtil } from '../utils/promise.util.js';

import type { HealthIndicator } from './health-indicator.js';

@Injectable()
export class HealthService {
  public constructor(
    @Inject(HEALTH_INDICATORS) private readonly indicators: readonly HealthIndicator[],
  ) {}

  public async report(): Promise<HealthReport> {
    const checks = await Promise.all(this.indicators.map((indicator) => this.run(indicator)));
    const down = this.indicators.filter((_, index) => checks[index]?.status === HealthStatus.Down);
    const status = down.some((indicator) => indicator.critical)
      ? HealthStatus.Down
      : down.length > 0
        ? HealthStatus.Degraded
        : HealthStatus.Up;
    return { status, checks };
  }

  private async run(indicator: HealthIndicator): Promise<HealthCheckResult> {
    const startedAt = performance.now();
    try {
      await PromiseUtil.withTimeout(indicator.check(), HEALTH_CHECK_TIMEOUT_MS, indicator.name);
      return { name: indicator.name, status: HealthStatus.Up, durationMs: this.since(startedAt) };
    } catch (error) {
      return {
        name: indicator.name,
        status: HealthStatus.Down,
        durationMs: this.since(startedAt),
        error: PromiseUtil.errorMessage(error),
      };
    }
  }

  private since(startedAt: number): number {
    return Math.round(performance.now() - startedAt);
  }
}
