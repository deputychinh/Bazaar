import { Environment } from '@bazaar/nest-common';

import type { GatewayEnv } from './env.schema.js';

/** Validated configuration, injected wherever a setting is needed. */
export class AppConfig {
  public constructor(public readonly env: Readonly<GatewayEnv>) {}

  public get isProduction(): boolean {
    return this.env.NODE_ENV === Environment.Production;
  }
}
