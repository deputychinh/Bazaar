import { Match } from 'aws-cdk-lib/assertions';

import {
  MSK_SASL_SCRAM_TLS_PORT,
  MYSQL_PORT,
  VALKEY_PORT,
} from '../lib/constants/data.constant.js';
import { EnvironmentName } from '../lib/enums/environment-name.enum.js';

import { buildFor, resourceCounts, templateOf } from './support/synth.js';

describe('DataStack', () => {
  const prodStacks = buildFor(EnvironmentName.Prod);
  const prod = templateOf(prodStacks.data);
  const dev = templateOf(buildFor(EnvironmentName.Dev).data);

  it('encrypts Aurora with the data key and requires TLS and IAM auth', () => {
    prod.hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: true,
      KmsKeyId: Match.anyValue(),
      EnableIAMDatabaseAuthentication: true,
      DeletionProtection: true,
    });
    prod.hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      Parameters: { require_secure_transport: 'ON' },
    });
    dev.hasResourceProperties('AWS::RDS::DBCluster', { DeletionProtection: false });
  });

  it('runs a writer plus a reader in prod and the writer alone in dev', () => {
    prod.resourceCountIs('AWS::RDS::DBInstance', 2);
    dev.resourceCountIs('AWS::RDS::DBInstance', 1);
  });

  it('rotates the admin and every service database secret', () => {
    prod.resourceCountIs('AWS::SecretsManager::RotationSchedule', 3);
  });

  it('opens no data port to the internet, only to the data-client group', () => {
    const ingress = prod.findResources('AWS::EC2::SecurityGroupIngress');
    const ports = [MYSQL_PORT, MSK_SASL_SCRAM_TLS_PORT, VALKEY_PORT];
    for (const rule of Object.values(ingress)) {
      const properties = rule.Properties as {
        CidrIp?: string;
        SourceSecurityGroupId?: unknown;
        FromPort: number;
      };
      expect(properties.CidrIp).toBeUndefined();
      expect(properties.SourceSecurityGroupId).toBeDefined();
    }
    const opened = Object.values(ingress).map(
      (rule) => (rule.Properties as { FromPort: number }).FromPort,
    );
    for (const port of ports) expect(opened).toContain(port);
  });

  it('serves Kafka over TLS with SASL/SCRAM only', () => {
    prod.hasResourceProperties('AWS::MSK::Cluster', {
      EncryptionInfo: { EncryptionInTransit: { ClientBroker: 'TLS', InCluster: true } },
      ClientAuthentication: {
        Sasl: { Scram: { Enabled: true } },
        Unauthenticated: { Enabled: false },
      },
    });
    prod.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: Match.stringLikeRegexp('^AmazonMSK_'),
      KmsKeyId: Match.anyValue(),
    });
  });

  it('encrypts the cache and takes its AUTH token from Secrets Manager at deploy time', () => {
    const groups = prod.findResources('AWS::ElastiCache::ReplicationGroup');
    const [group] = Object.values(groups);
    const properties = group?.Properties as Record<string, unknown>;
    expect(properties).toMatchObject({
      TransitEncryptionEnabled: true,
      AtRestEncryptionEnabled: true,
      MultiAZEnabled: true,
      NumCacheClusters: 2,
    });
    expect(JSON.stringify(properties.AuthToken)).toContain('{{resolve:secretsmanager:');
  });

  it('creates the Atlas cluster with three electable nodes, reached over PrivateLink', () => {
    prod.hasResourceProperties('MongoDB::Atlas::Cluster', {
      ClusterType: 'REPLICASET',
      TerminationProtectionEnabled: true,
      ReplicationSpecs: [
        Match.objectLike({
          AdvancedRegionConfigs: [
            Match.objectLike({
              RegionName: 'AP_SOUTHEAST_1',
              ElectableSpecs: { InstanceSize: 'M30', NodeCount: 3 },
            }),
          ],
        }),
      ],
    });
    prod.resourceCountIs('MongoDB::Atlas::PrivateEndpointAWS', 1);
    prod.resourceCountIs('MongoDB::Atlas::DatabaseUser', 2);
  });

  it('keeps every bucket private and HTTPS-only', () => {
    prod.allResourcesProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
    const policies = prod.findResources('AWS::S3::BucketPolicy');
    for (const policy of Object.values(policies)) {
      expect(JSON.stringify(policy)).toContain('"aws:SecureTransport":"false"');
    }
  });

  it('matches the resource inventory', () => {
    expect(resourceCounts(prodStacks.data)).toMatchSnapshot();
  });
});
