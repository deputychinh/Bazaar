import type * as ec2 from 'aws-cdk-lib/aws-ec2';
import type * as iam from 'aws-cdk-lib/aws-iam';
import type * as kms from 'aws-cdk-lib/aws-kms';
import type * as s3 from 'aws-cdk-lib/aws-s3';

import type { BazaarStackProps } from './bazaar-stack-props.interface.js';

export interface ClusterStackProps extends BazaarStackProps {
  readonly vpc: ec2.IVpc;
  /** Nodes join it so the data stores admit them (DataStack). */
  readonly dataClientSecurityGroup: ec2.ISecurityGroup;
  readonly dataKey: kms.IKey;
  readonly imagesBucket: s3.IBucket;
  /** ARNs External Secrets may read (all under bazaar/<env>/ plus the MSK SCRAM secret). */
  readonly secretArns: readonly string[];
  /** The CI role that applies the app manifests (CiStack). */
  readonly deployRole: iam.IRole;
}
