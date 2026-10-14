import { Match } from 'aws-cdk-lib/assertions';

import { API_PATH, NEXT_STATIC_PATH } from '../lib/constants/edge.constant.js';
import { EnvironmentName } from '../lib/enums/environment-name.enum.js';

import { buildFor, resourceCounts, templateOf } from './support/synth.js';

describe('Edge stacks', () => {
  const prod = buildFor(EnvironmentName.Prod);
  const dev = buildFor(EnvironmentName.Dev);
  const edge = templateOf(prod.edge);
  const global = templateOf(prod.edgeGlobal);

  it('puts the WAF web ACL and the viewer certificate in us-east-1', () => {
    expect(prod.edgeGlobal.region).toBe('us-east-1');
    global.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'CLOUDFRONT',
      Rules: Match.arrayWith([
        Match.objectLike({ Name: 'AWSManagedRulesCommonRuleSet' }),
        Match.objectLike({ Name: 'RateLimitPerIp', Action: { Block: {} } }),
      ]),
    });
    global.resourceCountIs('AWS::CertificateManager::Certificate', 1);
    templateOf(dev.edgeGlobal).resourceCountIs('AWS::CertificateManager::Certificate', 0);
  });

  it('serves three distributions behind WAF, HTTPS only, with TLS 1.2+ when there is a domain', () => {
    edge.resourceCountIs('AWS::CloudFront::Distribution', 3);
    edge.allResourcesProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        WebACLId: Match.anyValue(),
        ViewerCertificate: Match.objectLike({ MinimumProtocolVersion: 'TLSv1.2_2021' }),
        Logging: Match.anyValue(),
      }),
    });
  });

  it('sends /api to the ALB uncached and /_next/static to S3', () => {
    edge.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['bazaar.example'],
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({ PathPattern: NEXT_STATIC_PATH }),
          Match.objectLike({
            PathPattern: API_PATH,
            ViewerProtocolPolicy: 'https-only',
            CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
          }),
        ]),
      }),
    });
  });

  it('routes admin SPA paths to index.html with a CloudFront Function', () => {
    edge.resourceCountIs('AWS::CloudFront::Function', 1);
  });

  it('reaches S3 through Origin Access Control only', () => {
    edge.resourceCountIs('AWS::CloudFront::OriginAccessControl', 3);
  });

  it('matches the resource inventory', () => {
    expect(resourceCounts(prod.edge)).toMatchSnapshot();
  });
});
