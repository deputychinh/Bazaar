import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as msk from 'aws-cdk-lib/aws-msk';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as atlas from 'awscdk-resources-mongodbatlas';
import type { Construct } from 'constructs';

import { acknowledge } from '../aspects/nag.js';
import {
  ATLAS_CLUSTER_NAME,
  ATLAS_PRIVATELINK_PORTS,
  BACKUP_EXPIRY_DAYS,
  BACKUP_TRANSITION_DAYS,
  MONGO_DATABASES,
  MONGODB_MAJOR_VERSION,
  MSK_SASL_SCRAM_TLS_PORT,
  MSK_SERVER_PROPERTIES,
  MYSQL_DATABASES,
  MYSQL_PORT,
  NONCURRENT_VERSION_EXPIRY_DAYS,
  VALKEY_ENGINE_VERSION,
  VALKEY_PORT,
} from '../constants/data.constant.js';
import { PROJECT_NAME } from '../constants/project.constant.js';
import type { DataStackProps } from '../interfaces/data-stack-props.interface.js';

/**
 * Managed replacements for the local data stores (plan §9A.1, §9A.2 DataStack). Everything sits in
 * isolated subnets and admits only members of `clientSecurityGroup`, which the EKS nodes join.
 * Credentials are generated into Secrets Manager (`bazaar/<env>/...`) and reach pods through
 * External Secrets; none is ever written in code or templates.
 */
export class DataStack extends Stack {
  public readonly key: kms.Key;
  public readonly clientSecurityGroup: ec2.SecurityGroup;
  public readonly aurora: rds.DatabaseCluster;
  public readonly kafka: msk.CfnCluster;
  public readonly kafkaSecret: secretsmanager.Secret;
  public readonly cache: elasticache.CfnReplicationGroup;
  public readonly cacheSecret: secretsmanager.Secret;
  public readonly atlasCluster: atlas.CfnCluster;
  public readonly imagesBucket: s3.Bucket;
  public readonly backupsBucket: s3.Bucket;
  /** Per-service credentials, keyed `mysql-identity`, `mongo-catalog`, … */
  public readonly serviceSecrets: ReadonlyMap<string, secretsmanager.ISecret>;

  public constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);
    const { config, vpc } = props;
    const retain = config.retainData;
    const secretPrefix = `${PROJECT_NAME}/${config.name}`;
    const isolated: ec2.SubnetSelection = { subnetType: ec2.SubnetType.PRIVATE_ISOLATED };
    const removalPolicy = retain ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
    const serviceSecrets = new Map<string, secretsmanager.ISecret>();

    this.key = new kms.Key(this, 'DataKey', {
      alias: `${PROJECT_NAME}/${config.name}/data`,
      description: 'Encrypts Bazaar data stores, their secrets and backups',
      enableKeyRotation: true,
      removalPolicy,
    });

    this.clientSecurityGroup = new ec2.SecurityGroup(this, 'DataClients', {
      vpc,
      description: 'Members may reach the data stores (EKS nodes join it)',
      allowAllOutbound: true,
    });
    const storeSecurityGroup = (name: string, port: ec2.Port): ec2.SecurityGroup => {
      const group = new ec2.SecurityGroup(this, `${name}Sg`, {
        vpc,
        description: `${name}: only from data clients`,
        allowAllOutbound: false,
      });
      group.addIngressRule(this.clientSecurityGroup, port, 'data clients');
      return group;
    };

    // --- Aurora MySQL (identity + orders) ------------------------------------------------------
    const auroraSg = storeSecurityGroup('Aurora', ec2.Port.tcp(MYSQL_PORT));
    const insights = { enablePerformanceInsights: true, performanceInsightEncryptionKey: this.key };
    this.aurora = new rds.DatabaseCluster(this, 'Aurora', {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_12_0,
      }),
      credentials: rds.Credentials.fromGeneratedSecret('bazaar_admin', {
        secretName: `${secretPrefix}/aurora/admin`,
        encryptionKey: this.key,
      }),
      writer: rds.ClusterInstance.serverlessV2('writer', insights),
      readers: Array.from({ length: config.aurora.readers }, (_, index) =>
        rds.ClusterInstance.serverlessV2(`reader${index + 1}`, {
          ...insights,
          scaleWithWriter: true,
        }),
      ),
      serverlessV2MinCapacity: config.aurora.minCapacityAcu,
      serverlessV2MaxCapacity: config.aurora.maxCapacityAcu,
      vpc,
      vpcSubnets: isolated,
      securityGroups: [auroraSg],
      storageEncrypted: true,
      storageEncryptionKey: this.key,
      iamAuthentication: true,
      parameters: { require_secure_transport: 'ON' },
      backup: { retention: Duration.days(config.aurora.backupRetentionDays) },
      cloudwatchLogsExports: ['error', 'general', 'slowquery', 'audit'],
      cloudwatchLogsRetention: config.logRetentionDays,
      monitoringInterval: Duration.seconds(60),
      enablePerformanceInsights: true,
      performanceInsightEncryptionKey: this.key,
      deletionProtection: retain,
      removalPolicy: retain ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY,
    });
    this.aurora.addRotationSingleUser({ automaticallyAfter: Duration.days(30) });
    acknowledge(this.aurora, [
      {
        id: 'AwsSolutions::AwsSolutions-RDS11',
        reason: 'Default port: the cluster is in isolated subnets and admits data clients only.',
      },
      {
        id: 'AwsSolutions::AwsSolutions-RDS14',
        reason:
          'Recovery uses point-in-time restore from continuous backups; backtrack is not enabled.',
      },
      {
        id: 'AwsSolutions::AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole]',
        reason:
          'AWS-managed policy RDS requires for Enhanced Monitoring; it only writes RDS OS metrics to CloudWatch.',
      },
      ...(retain
        ? []
        : [
            {
              id: 'AwsSolutions::AwsSolutions-RDS10',
              reason: 'Dev is disposable by design; prod enables deletion protection.',
            },
          ]),
    ]);
    // One user per service database; the bootstrap Job creates them, rotation keeps them fresh.
    for (const [service, database] of Object.entries(MYSQL_DATABASES)) {
      const secret = new rds.DatabaseSecret(this, `MysqlUser-${service}`, {
        username: database,
        secretName: `${secretPrefix}/aurora/${service}`,
        encryptionKey: this.key,
        masterSecret: this.aurora.secret,
      });
      const attached = secret.attach(this.aurora);
      this.aurora.addRotationMultiUser(`Rotate-${service}`, {
        secret: attached,
        automaticallyAfter: Duration.days(30),
      });
      serviceSecrets.set(`mysql-${service}`, attached);
    }

    // --- MSK (Kafka over TLS with SASL/SCRAM) --------------------------------------------------
    const kafkaSg = storeSecurityGroup('Kafka', ec2.Port.tcp(MSK_SASL_SCRAM_TLS_PORT));
    const kafkaLogs = new logs.LogGroup(this, 'KafkaLogs', {
      retention: config.logRetentionDays,
      removalPolicy,
    });
    const kafkaConfig = new msk.CfnConfiguration(this, 'KafkaConfig', {
      name: `${PROJECT_NAME}-${config.name}`,
      serverProperties: MSK_SERVER_PROPERTIES,
    });
    this.kafka = new msk.CfnCluster(this, 'Kafka', {
      clusterName: `${PROJECT_NAME}-${config.name}`,
      kafkaVersion: config.msk.kafkaVersion,
      numberOfBrokerNodes: config.msk.brokerNodes,
      brokerNodeGroupInfo: {
        instanceType: config.msk.instanceType,
        clientSubnets: vpc.selectSubnets(isolated).subnetIds,
        securityGroups: [kafkaSg.securityGroupId],
        storageInfo: { ebsStorageInfo: { volumeSize: config.msk.volumeSizeGb } },
      },
      encryptionInfo: {
        encryptionAtRest: { dataVolumeKmsKeyId: this.key.keyArn },
        encryptionInTransit: { clientBroker: 'TLS', inCluster: true },
      },
      clientAuthentication: {
        sasl: { scram: { enabled: true } },
        unauthenticated: { enabled: false },
      },
      configurationInfo: { arn: kafkaConfig.attrArn, revision: 1 },
      enhancedMonitoring: 'PER_TOPIC_PER_PARTITION',
      loggingInfo: {
        brokerLogs: { cloudWatchLogs: { enabled: true, logGroup: kafkaLogs.logGroupName } },
      },
    });
    // MSK only accepts SCRAM secrets named AmazonMSK_* and encrypted with a customer key.
    this.kafkaSecret = new secretsmanager.Secret(this, 'KafkaScram', {
      secretName: `AmazonMSK_${PROJECT_NAME}-${config.name}-apps`,
      encryptionKey: this.key,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: PROJECT_NAME }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
      removalPolicy,
    });
    new msk.CfnBatchScramSecret(this, 'KafkaScramAssociation', {
      clusterArn: this.kafka.attrArn,
      secretArnList: [this.kafkaSecret.secretArn],
    });
    acknowledge(this.kafkaSecret, [
      {
        id: 'AwsSolutions::AwsSolutions-SMG4',
        reason:
          'MSK SCRAM credentials have no managed rotation; the runbook rotates them (new secret, re-associate, roll pods).',
      },
    ]);

    // --- ElastiCache Valkey (rate limits, caches, locks) ---------------------------------------
    const cacheSg = storeSecurityGroup('Cache', ec2.Port.tcp(VALKEY_PORT));
    this.cacheSecret = new secretsmanager.Secret(this, 'CacheAuth', {
      secretName: `${secretPrefix}/cache/auth`,
      encryptionKey: this.key,
      generateSecretString: { excludePunctuation: true, passwordLength: 64 },
      removalPolicy,
    });
    acknowledge(this.cacheSecret, [
      {
        id: 'AwsSolutions::AwsSolutions-SMG4',
        reason:
          'ElastiCache AUTH tokens rotate through ModifyReplicationGroup (ROTATE then SET), run by the runbook.',
      },
    ]);
    const cacheSubnets = new elasticache.CfnSubnetGroup(this, 'CacheSubnets', {
      description: 'Isolated subnets for Valkey',
      subnetIds: vpc.selectSubnets(isolated).subnetIds,
    });
    const highlyAvailable = config.cache.replicas > 0;
    this.cache = new elasticache.CfnReplicationGroup(this, 'Cache', {
      replicationGroupDescription: `${PROJECT_NAME} ${config.name} cache`,
      engine: 'valkey',
      engineVersion: VALKEY_ENGINE_VERSION,
      cacheNodeType: config.cache.nodeType,
      numCacheClusters: 1 + config.cache.replicas,
      automaticFailoverEnabled: highlyAvailable,
      multiAzEnabled: highlyAvailable,
      cacheSubnetGroupName: cacheSubnets.ref,
      securityGroupIds: [cacheSg.securityGroupId],
      port: VALKEY_PORT,
      transitEncryptionEnabled: true,
      atRestEncryptionEnabled: true,
      kmsKeyId: this.key.keyId,
      // A dynamic reference: CloudFormation resolves it at deploy time, the template never holds it.
      authToken: this.cacheSecret.secretValue.unsafeUnwrap(),
      snapshotRetentionLimit: retain ? 7 : 0,
    });
    if (!highlyAvailable) {
      acknowledge(this.cache, [
        {
          id: 'AwsSolutions::AwsSolutions-AEC4',
          reason: 'Dev runs a single cache node on purpose (cost); prod has a Multi-AZ replica.',
        },
      ]);
    }

    // --- MongoDB Atlas (catalog + notification) over PrivateLink --------------------------------
    const orgId = ssm.StringParameter.valueForStringParameter(this, config.atlas.orgIdParameter);
    const project = new atlas.CfnProject(this, 'AtlasProject', {
      name: `${PROJECT_NAME}-${config.name}`,
      orgId,
      profile: config.atlas.profile,
    });
    this.atlasCluster = new atlas.CfnCluster(this, 'AtlasCluster', {
      profile: config.atlas.profile,
      projectId: project.attrId,
      name: ATLAS_CLUSTER_NAME,
      clusterType: 'REPLICASET',
      mongoDbMajorVersion: MONGODB_MAJOR_VERSION,
      backupEnabled: true,
      pitEnabled: retain,
      terminationProtectionEnabled: retain,
      diskSizeGb: config.atlas.diskSizeGb,
      replicationSpecs: [
        {
          numShards: 1,
          advancedRegionConfigs: [
            {
              regionName: config.region.toUpperCase().replaceAll('-', '_'),
              providerName: atlas.AdvancedRegionConfigProviderName.AWS,
              priority: 7,
              electableSpecs: { instanceSize: config.atlas.instanceSize, nodeCount: 3 },
            },
          ],
        },
      ],
    });
    const endpointService = new atlas.CfnPrivateEndpointService(this, 'AtlasEndpointService', {
      profile: config.atlas.profile,
      projectId: project.attrId,
      region: config.region,
      cloudProvider: atlas.CfnPrivateEndpointServicePropsCloudProvider.AWS,
    });
    const atlasSg = storeSecurityGroup(
      'Atlas',
      ec2.Port.tcpRange(ATLAS_PRIVATELINK_PORTS.from, ATLAS_PRIVATELINK_PORTS.to),
    );
    const atlasEndpoint = new ec2.InterfaceVpcEndpoint(this, 'AtlasEndpoint', {
      vpc,
      service: new ec2.InterfaceVpcEndpointService(endpointService.attrEndpointServiceName),
      subnets: isolated,
      securityGroups: [atlasSg],
      privateDnsEnabled: false,
      open: false,
    });
    new atlas.CfnPrivateEndpointAws(this, 'AtlasEndpointLink', {
      profile: config.atlas.profile,
      projectId: project.attrId,
      endpointServiceId: endpointService.attrId,
      id: atlasEndpoint.vpcEndpointId,
    });
    for (const [service, database] of Object.entries(MONGO_DATABASES)) {
      const secret = new secretsmanager.Secret(this, `MongoUser-${service}`, {
        secretName: `${secretPrefix}/atlas/${service}`,
        encryptionKey: this.key,
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ username: database }),
          generateStringKey: 'password',
          excludePunctuation: true,
          passwordLength: 32,
        },
        removalPolicy,
      });
      new atlas.CfnDatabaseUser(this, `AtlasUser-${service}`, {
        profile: config.atlas.profile,
        projectId: project.attrId,
        databaseName: 'admin',
        username: database,
        password: secret.secretValueFromJson('password').unsafeUnwrap(),
        roles: [{ roleName: 'readWrite', databaseName: database }],
        scopes: [{ name: ATLAS_CLUSTER_NAME, type: atlas.ScopeDefinitionType.CLUSTER }],
      });
      acknowledge(secret, [
        {
          id: 'AwsSolutions::AwsSolutions-SMG4',
          reason:
            'Atlas database users are rotated through the Atlas API by the runbook; no AWS rotation applies.',
        },
      ]);
      serviceSecrets.set(`mongo-${service}`, secret);
    }

    // --- S3: product images and backups ----------------------------------------------------------
    const accessLogs = new s3.Bucket(this, 'AccessLogs', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [{ expiration: Duration.days(config.logRetentionDays) }],
      removalPolicy,
      autoDeleteObjects: !retain,
    });
    acknowledge(accessLogs, [
      {
        id: 'AwsSolutions::AwsSolutions-S1',
        reason: 'This is the access-log bucket; logging it into itself would loop.',
      },
    ]);
    this.imagesBucket = new s3.Bucket(this, 'Images', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      serverAccessLogsBucket: accessLogs,
      serverAccessLogsPrefix: 'images/',
      // Sellers upload straight from the admin site with presigned PUT URLs (plan §2B Images).
      // Without a domain the admin origin is a CloudFront name unknown here; the URL signature
      // still limits who can write.
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins:
            config.domainName === undefined ? ['*'] : [`https://admin.${config.domainName}`],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        { noncurrentVersionExpiration: Duration.days(NONCURRENT_VERSION_EXPIRY_DAYS) },
      ],
      removalPolicy,
      autoDeleteObjects: !retain,
    });
    this.backupsBucket = new s3.Bucket(this, 'Backups', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.key,
      bucketKeyEnabled: true,
      enforceSSL: true,
      versioned: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      serverAccessLogsBucket: accessLogs,
      serverAccessLogsPrefix: 'backups/',
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
              transitionAfter: Duration.days(BACKUP_TRANSITION_DAYS),
            },
          ],
          expiration: Duration.days(BACKUP_EXPIRY_DAYS),
          noncurrentVersionExpiration: Duration.days(NONCURRENT_VERSION_EXPIRY_DAYS),
        },
      ],
      removalPolicy,
      autoDeleteObjects: !retain,
    });

    this.serviceSecrets = serviceSecrets;
    this.acknowledgeLogRetention();
  }

  /** CDK's log-retention helper Lambda (created for the Aurora log exports). */
  private acknowledgeLogRetention(): void {
    const helper = this.node.children.find((child) => child.node.id.startsWith('LogRetention'));
    if (helper === undefined) return;
    acknowledge(helper, [
      {
        id: 'AwsSolutions::AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]',
        reason:
          'CDK-owned helper that sets log retention; the managed policy only lets it write its own logs.',
      },
      {
        id: 'AwsSolutions::AwsSolutions-IAM5[Resource::*]',
        reason:
          'CDK-owned helper: logs:PutRetentionPolicy on log groups created by RDS, unknown until deploy.',
      },
    ]);
  }
}
