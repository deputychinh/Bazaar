import type * as elasticache from 'aws-cdk-lib/aws-elasticache';
import type * as msk from 'aws-cdk-lib/aws-msk';
import type * as rds from 'aws-cdk-lib/aws-rds';

import type { BazaarStackProps } from './bazaar-stack-props.interface.js';

export interface ObservabilityStackProps extends BazaarStackProps {
  readonly aurora: rds.IDatabaseCluster;
  readonly kafka: msk.CfnCluster;
  readonly cache: elasticache.CfnReplicationGroup;
  readonly clusterName: string;
}
