import type { LogLevel } from '../enums/log-level.enum.js';

export interface LoggerModuleOptions {
  serviceName: string;
  level: LogLevel;
  /** Human-readable output for local development; JSON otherwise. */
  pretty: boolean;
}
