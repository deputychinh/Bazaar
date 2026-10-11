import type { NotificationEnv } from './env.schema.js';

/** Validated configuration, injected wherever a setting is needed. */
export class AppConfig {
  public constructor(public readonly env: Readonly<NotificationEnv>) {}
}
