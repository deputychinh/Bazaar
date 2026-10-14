import type * as ec2 from 'aws-cdk-lib/aws-ec2';

import type { BazaarStackProps } from './bazaar-stack-props.interface.js';

export interface DataStackProps extends BazaarStackProps {
  readonly vpc: ec2.IVpc;
}
