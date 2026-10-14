import type * as acm from 'aws-cdk-lib/aws-certificatemanager';

import type { BazaarStackProps } from './bazaar-stack-props.interface.js';

export interface EdgeStackProps extends BazaarStackProps {
  /** WAF web ACL from EdgeGlobalStack (us-east-1). */
  readonly webAclArn: string;
  /** Viewer certificate from EdgeGlobalStack, when the environment has a domain. */
  readonly certificate?: acm.ICertificate;
}
