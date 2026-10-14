import type { StackProps } from 'aws-cdk-lib';

import type { EnvironmentConfig } from './environment-config.interface.js';

/** Props every Bazaar stack receives: the environment it is built for. */
export interface BazaarStackProps extends StackProps {
  readonly config: EnvironmentConfig;
}
