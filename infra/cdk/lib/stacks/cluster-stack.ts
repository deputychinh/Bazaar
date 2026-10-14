import { KubectlV35Layer } from '@aws-cdk/lambda-layer-kubectl-v35';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks-v2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import type { Construct } from 'constructs';

import { acknowledge } from '../aspects/nag.js';
import {
  APPS_NAMESPACE,
  EXTERNAL_SECRETS_CHART,
  EXTERNAL_SECRETS_NAMESPACE,
  NODE_DISK_SIZE_GB,
  POD_IDENTITY_ACCOUNTS,
} from '../constants/cluster.constant.js';
import { PROJECT_NAME } from '../constants/project.constant.js';
import type { ClusterStackProps } from '../interfaces/cluster-stack-props.interface.js';
import { imagesBucketName } from '../naming.js';

/**
 * EKS for the same manifests that run on kind (plan §9A.1, §9A.2 ClusterStack): Graviton managed
 * nodes in private subnets, add-ons, and an AWS identity per app through EKS Pod Identity — pods
 * never see node credentials (IMDSv2 with a hop limit of 1).
 */
export class ClusterStack extends Stack {
  public readonly cluster: eks.Cluster;

  public constructor(scope: Construct, id: string, props: ClusterStackProps) {
    super(scope, id, props);
    const { config, vpc } = props;
    const privateSubnets: ec2.SubnetSelection = { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS };

    const secretsKey = new kms.Key(this, 'SecretsKey', {
      alias: `${PROJECT_NAME}/${config.name}/eks-secrets`,
      description: 'Envelope encryption of Kubernetes Secrets',
      enableKeyRotation: true,
      removalPolicy: config.retainData ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    this.cluster = new eks.Cluster(this, 'Cluster', {
      clusterName: `${PROJECT_NAME}-${config.name}`,
      version: eks.KubernetesVersion.V1_35,
      vpc,
      vpcSubnets: [privateSubnets],
      // Managed node groups (plan §9A.1), not Auto Mode: node type and disks stay under our control.
      defaultCapacityType: eks.DefaultCapacityType.NODEGROUP,
      defaultCapacity: 0,
      // The API is public so the deploy pipeline can reach it, but every call is IAM-authenticated.
      endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
      secretsEncryptionKey: secretsKey,
      clusterLogging: [
        eks.ClusterLoggingTypes.API,
        eks.ClusterLoggingTypes.AUDIT,
        eks.ClusterLoggingTypes.AUTHENTICATOR,
        eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
        eks.ClusterLoggingTypes.SCHEDULER,
      ],
      albController: { version: eks.AlbControllerVersion.V3_2_2 },
      kubectlProviderOptions: { kubectlLayer: new KubectlV35Layer(this, 'Kubectl') },
    });

    // Nodes: Graviton (same arm64 as the laptop images), IMDSv2 only, encrypted disks, and a member
    // of the data-client group so Aurora, MSK, Valkey and Atlas admit them.
    const launchTemplate = new ec2.LaunchTemplate(this, 'NodeTemplate', {
      requireImdsv2: true,
      httpPutResponseHopLimit: 1,
      securityGroup: props.dataClientSecurityGroup,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(NODE_DISK_SIZE_GB, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });
    launchTemplate.addSecurityGroup(this.cluster.clusterSecurityGroup);
    const nodegroup = this.cluster.addNodegroupCapacity('Apps', {
      amiType: eks.NodegroupAmiType.AL2023_ARM_64_STANDARD,
      instanceTypes: [new ec2.InstanceType(config.eks.instanceType)],
      minSize: config.eks.minNodes,
      desiredSize: config.eks.desiredNodes,
      maxSize: config.eks.maxNodes,
      subnets: privateSubnets,
      launchTemplateSpec: {
        id: launchTemplate.launchTemplateId ?? '',
        version: launchTemplate.latestVersionNumber,
      },
      enableNodeAutoRepair: true,
    });

    // Managed add-ons. metrics-server feeds the HPAs of the base manifests.
    // eks-pod-identity-agent is installed by the Cluster construct itself.
    new eks.Addon(this, 'MetricsServer', { cluster: this.cluster, addonName: 'metrics-server' });
    const ebsCsiRole = new iam.Role(this, 'EbsCsiRole', {
      assumedBy: new iam.ServicePrincipal('pods.eks.amazonaws.com').withSessionTags(),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEBSCSIDriverPolicy'),
      ],
    });
    const ebsCsi = new eks.Addon(this, 'EbsCsi', {
      cluster: this.cluster,
      addonName: 'aws-ebs-csi-driver',
    });
    new eks.CfnPodIdentityAssociation(this, 'EbsCsiIdentity', {
      clusterName: this.cluster.clusterName,
      namespace: 'kube-system',
      serviceAccount: 'ebs-csi-controller-sa',
      roleArn: ebsCsiRole.roleArn,
    }).node.addDependency(ebsCsi);

    // Namespaces, then a service account with an AWS identity for each app that calls AWS.
    const appsNamespace = this.cluster.addManifest('AppsNamespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: APPS_NAMESPACE,
        labels: { 'pod-security.kubernetes.io/enforce': 'restricted' },
      },
    });
    const secretsNamespace = this.cluster.addManifest('ExternalSecretsNamespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: EXTERNAL_SECRETS_NAMESPACE },
    });
    const podIdentity = (name: string, namespace: string): eks.ServiceAccount =>
      this.cluster.addServiceAccount(`Sa-${name}`, {
        name,
        namespace,
        identityType: eks.IdentityType.POD_IDENTITY,
      });

    const catalog = podIdentity(POD_IDENTITY_ACCOUNTS.catalog, APPS_NAMESPACE);
    catalog.node.addDependency(appsNamespace);
    // Presigned uploads are signed with this role: object read/write/delete, nothing on the bucket.
    const imagesObjects = `arn:aws:s3:::${imagesBucketName(config)}/*`;
    catalog.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
        resources: [imagesObjects],
      }),
    );

    const notification = podIdentity(POD_IDENTITY_ACCOUNTS.notification, APPS_NAMESPACE);
    notification.node.addDependency(appsNamespace);
    const sesIdentity =
      config.domainName === undefined
        ? `arn:aws:ses:${this.region}:${this.account}:identity/*`
        : `arn:aws:ses:${this.region}:${this.account}:identity/${config.domainName}`;
    notification.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: [sesIdentity],
      }),
    );

    const externalSecrets = podIdentity(
      POD_IDENTITY_ACCOUNTS.externalSecrets,
      EXTERNAL_SECRETS_NAMESPACE,
    );
    externalSecrets.node.addDependency(secretsNamespace);
    externalSecrets.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
        resources: [...props.secretArns],
      }),
    );
    // Endpoints for the connection URLs (written by DataStack and the deploy pipeline).
    const endpointParameters = `arn:aws:ssm:${config.region}:${config.account}:parameter/${PROJECT_NAME}/${config.name}/*`;
    externalSecrets.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
        resources: [endpointParameters],
      }),
    );
    props.dataKey.grantDecrypt(externalSecrets);
    const externalSecretsChart = this.cluster.addHelmChart('ExternalSecrets', {
      ...EXTERNAL_SECRETS_CHART,
      release: 'external-secrets',
      namespace: EXTERNAL_SECRETS_NAMESPACE,
      values: {
        installCRDs: true,
        serviceAccount: { create: false, name: POD_IDENTITY_ACCOUNTS.externalSecrets },
      },
    });
    externalSecretsChart.node.addDependency(externalSecrets);

    // The pipeline applies the app manifests: admin inside the apps namespace only.
    this.cluster.grantAccess('Deploy', props.deployRole.roleArn, [
      eks.AccessPolicy.fromAccessPolicyName('AmazonEKSAdminPolicy', {
        accessScopeType: eks.AccessScopeType.NAMESPACE,
        namespaces: [APPS_NAMESPACE],
      }),
    ]);

    acknowledge(ebsCsiRole, [
      {
        id: 'AwsSolutions::AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy]',
        reason: 'AWS-managed policy the EBS CSI add-on is designed for.',
      },
    ]);
    this.acknowledgeFindings(
      nodegroup,
      imagesObjects,
      sesIdentity,
      props.secretArns[0] ?? '',
      endpointParameters,
    );
  }

  /**
   * Findings on constructs CDK and AWS own (kubectl provider, node and cluster roles, the official
   * AWS Load Balancer Controller policy), plus our object-level wildcards. Acknowledged on the exact
   * construct, so a new wildcard anywhere else still fails the synth.
   */
  private acknowledgeFindings(
    nodegroup: eks.Nodegroup,
    imagesObjects: string,
    sesIdentity: string,
    appSecrets: string,
    endpointParameters: string,
  ): void {
    const managed = (policy: string): string =>
      `AwsSolutions::AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/${policy}]`;
    const wildcard = (resource: string): string =>
      `AwsSolutions::AwsSolutions-IAM5[Resource::${resource}]`;

    acknowledge(this.cluster, [
      {
        id: 'AwsSolutions::AwsSolutions-EKS1',
        reason:
          'Public endpoint for the deploy pipeline; IAM access entries authenticate every call. Restrict CIDRs once self-hosted runners exist.',
      },
    ]);
    acknowledge(this.cluster.node.findChild('Role'), [
      {
        id: managed('AmazonEKSClusterPolicy'),
        reason: 'The EKS service role policy AWS requires.',
      },
    ]);
    acknowledge(nodegroup, [
      { id: managed('AmazonEKSWorkerNodePolicy'), reason: 'Required by EKS managed nodes.' },
      { id: managed('AmazonEKS_CNI_Policy'), reason: 'Required by the VPC CNI on the nodes.' },
      { id: managed('AmazonEC2ContainerRegistryReadOnly'), reason: 'Nodes pull images from ECR.' },
    ]);
    const kubectlReason =
      'CDK-owned kubectl provider that applies the manifests and Helm charts above.';
    acknowledge(this.cluster.node.findChild('KubectlProvider'), [
      {
        id: 'AwsSolutions::AwsSolutions-L1',
        reason: `${kubectlReason} Its runtime is pinned by CDK.`,
      },
      { id: managed('service-role/AWSLambdaBasicExecutionRole'), reason: kubectlReason },
      { id: managed('service-role/AWSLambdaVPCAccessExecutionRole'), reason: kubectlReason },
      { id: managed('AmazonEC2ContainerRegistryReadOnly'), reason: kubectlReason },
      {
        id: 'AwsSolutions::AwsSolutions-IAM4[Policy::{"Fn::If":["ClusterKubectlProviderHandlerHasEcrPublic69E09706",{"Fn::Join":["",["arn:",{"Ref":"AWS::Partition"},":iam::aws:policy/AmazonElasticContainerRegistryPublicReadOnly"]]},{"Ref":"AWS::NoValue"}]}]',
        reason: kubectlReason,
      },
      { id: wildcard('<ClusterKubectlProviderHandler2E05C68A.Arn>:*'), reason: kubectlReason },
    ]);
    const albController = this.node.children.find((child) =>
      child.node.id.endsWith('-AlbController'),
    );
    if (albController !== undefined) {
      const albReason =
        'Official AWS Load Balancer Controller IAM policy (kubernetes-sigs), shipped by CDK.';
      acknowledge(
        albController,
        [
          '*',
          'arn:<AWS::Partition>:ec2:*:*:security-group/*',
          'arn:<AWS::Partition>:elasticloadbalancing:*:*:listener-rule/app/*/*/*',
          'arn:<AWS::Partition>:elasticloadbalancing:*:*:listener-rule/net/*/*/*',
          'arn:<AWS::Partition>:elasticloadbalancing:*:*:listener/app/*/*/*',
          'arn:<AWS::Partition>:elasticloadbalancing:*:*:listener/net/*/*/*',
          'arn:<AWS::Partition>:elasticloadbalancing:*:*:loadbalancer/app/*/*',
          'arn:<AWS::Partition>:elasticloadbalancing:*:*:loadbalancer/net/*/*',
          'arn:<AWS::Partition>:elasticloadbalancing:*:*:targetgroup/*/*',
        ].map((resource) => ({ id: wildcard(resource), reason: albReason })),
      );
    }
    acknowledge(this, [
      {
        id: wildcard(imagesObjects),
        reason: 'Catalog reads, writes and deletes any product image object.',
      },
      {
        id: wildcard(appSecrets),
        reason: "External Secrets reads this environment's app secrets only.",
      },
      {
        id: wildcard(endpointParameters),
        reason: "External Secrets reads this environment's endpoint parameters only.",
      },
      ...(sesIdentity.endsWith('/*')
        ? [
            {
              id: wildcard(sesIdentity),
              reason:
                'Dev has no domain: any verified SES identity of the account (sandbox) may send.',
            },
          ]
        : []),
    ]);
  }
}
