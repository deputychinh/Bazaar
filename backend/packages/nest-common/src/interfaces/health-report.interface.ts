import type { HealthStatus } from '../enums/health-status.enum.js';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  durationMs: number;
  error?: string;
}

export interface HealthReport {
  status: HealthStatus;
  checks: HealthCheckResult[];
}
