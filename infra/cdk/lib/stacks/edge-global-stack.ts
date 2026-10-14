import { Stack } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import type { Construct } from 'constructs';

import { WAF_RATE_LIMIT } from '../constants/edge.constant.js';
import { PROJECT_NAME } from '../constants/project.constant.js';
import type { BazaarStackProps } from '../interfaces/bazaar-stack-props.interface.js';

const managedRule = (name: string, priority: number): wafv2.CfnWebACL.RuleProperty => ({
  name,
  priority,
  overrideAction: { none: {} },
  statement: { managedRuleGroupStatement: { vendorName: 'AWS', name } },
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: name,
    sampledRequestsEnabled: true,
  },
});

/**
 * The us-east-1 half of the edge (plan §9A.1): CloudFront only accepts web ACLs and certificates
 * from that region. The regional EdgeStack reads both through cross-region references.
 */
export class EdgeGlobalStack extends Stack {
  public readonly webAclArn: string;
  public readonly certificate?: acm.ICertificate;

  public constructor(scope: Construct, id: string, props: BazaarStackProps) {
    super(scope, id, props);
    const { config } = props;

    const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: `${PROJECT_NAME}-${config.name}`,
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${PROJECT_NAME}-${config.name}`,
        sampledRequestsEnabled: true,
      },
      rules: [
        managedRule('AWSManagedRulesAmazonIpReputationList', 0),
        managedRule('AWSManagedRulesCommonRuleSet', 1),
        managedRule('AWSManagedRulesKnownBadInputsRuleSet', 2),
        {
          name: 'RateLimitPerIp',
          priority: 3,
          action: { block: {} },
          statement: { rateBasedStatement: { limit: WAF_RATE_LIMIT, aggregateKeyType: 'IP' } },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitPerIp',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });
    this.webAclArn = webAcl.attrArn;

    if (config.domainName !== undefined && config.hostedZoneId !== undefined) {
      const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
        hostedZoneId: config.hostedZoneId,
        zoneName: config.domainName,
      });
      this.certificate = new acm.Certificate(this, 'ViewerCertificate', {
        domainName: config.domainName,
        subjectAlternativeNames: [`*.${config.domainName}`],
        validation: acm.CertificateValidation.fromDns(zone),
      });
    }
  }
}
