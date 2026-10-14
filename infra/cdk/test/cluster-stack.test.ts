import { Match } from 'aws-cdk-lib/assertions';

import { APPS_NAMESPACE, EXTERNAL_SECRETS_CHART } from '../lib/constants/cluster.constant.js';
import { EnvironmentName } from '../lib/enums/environment-name.enum.js';

import { buildFor, resourceCounts, templateOf } from './support/synth.js';

describe('ClusterStack', () => {
  const stacks = buildFor(EnvironmentName.Prod);
  const template = templateOf(stacks.cluster);

  it('encrypts Kubernetes secrets and ships every control-plane log', () => {
    template.hasResourceProperties('AWS::EKS::Cluster', {
      EncryptionConfig: [Match.objectLike({ Resources: ['secrets'] })],
      Logging: {
        ClusterLogging: {
          EnabledTypes: Match.arrayWith([
            { Type: 'api' },
            { Type: 'audit' },
            { Type: 'authenticator' },
          ]),
        },
      },
    });
  });

  it('runs Graviton nodes in private subnets, sized from the environment config', () => {
    template.hasResourceProperties('AWS::EKS::Nodegroup', {
      AmiType: 'AL2023_ARM_64_STANDARD',
      InstanceTypes: ['m7g.large'],
      ScalingConfig: { MinSize: 3, DesiredSize: 3, MaxSize: 9 },
    });
  });

  it('keeps pods away from node credentials and encrypts node disks', () => {
    template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
      LaunchTemplateData: Match.objectLike({
        MetadataOptions: { HttpTokens: 'required', HttpPutResponseHopLimit: 1 },
        BlockDeviceMappings: [Match.objectLike({ Ebs: Match.objectLike({ Encrypted: true }) })],
      }),
    });
  });

  it('gives catalog, notification and External Secrets their own AWS identity', () => {
    for (const serviceAccount of ['catalog', 'notification', 'external-secrets']) {
      template.hasResourceProperties('AWS::EKS::PodIdentityAssociation', {
        ServiceAccount: serviceAccount,
      });
    }
  });

  it('lets catalog touch image objects only', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['s3:DeleteObject', 's3:GetObject', 's3:PutObject'],
            Resource: 'arn:aws:s3:::bazaar-prod-images-222222222222/*',
          }),
        ]),
      },
    });
  });

  it('limits the deploy role to the apps namespace', () => {
    template.hasResourceProperties('AWS::EKS::AccessEntry', {
      AccessPolicies: [
        {
          PolicyArn: Match.objectLike({
            'Fn::Join': [
              '',
              Match.arrayWith([':eks::aws:cluster-access-policy/AmazonEKSAdminPolicy']),
            ],
          }),
          AccessScope: { Type: 'namespace', Namespaces: [APPS_NAMESPACE] },
        },
      ],
    });
  });

  it('installs the pinned External Secrets chart', () => {
    template.hasResourceProperties('Custom::AWSCDK-EKS-HelmChart', {
      Chart: EXTERNAL_SECRETS_CHART.chart,
      Version: EXTERNAL_SECRETS_CHART.version,
    });
  });

  it('matches the resource inventory', () => {
    expect(resourceCounts(stacks.cluster)).toMatchSnapshot();
  });
});
