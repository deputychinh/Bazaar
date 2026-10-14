import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

import type { BazaarStackProps } from './bazaar-stack-props.interface.js';

export interface EdgeMonitoringStackProps extends BazaarStackProps {
  /** Distributions to watch, by label (CloudFront metrics exist in us-east-1 only). */
  readonly distributions: Readonly<Record<string, cloudfront.Distribution>>;
}
