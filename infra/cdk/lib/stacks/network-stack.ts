import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import type { Construct } from 'constructs';

import { acknowledge } from '../aspects/nag.js';
import type { BazaarStackProps } from '../interfaces/bazaar-stack-props.interface.js';

/**
 * The VPC (plan §9A.2 NetworkStack): public subnets for load balancers and NAT, private subnets for
 * EKS nodes, isolated subnets for the data stores. Endpoints keep image pulls, secrets and logs off
 * the NAT gateways (cheaper, and that traffic never leaves AWS).
 */
export class NetworkStack extends Stack {
  public readonly vpc: ec2.Vpc;

  public constructor(scope: Construct, id: string, props: BazaarStackProps) {
    super(scope, id, props);
    const { config } = props;

    const flowLogs = new logs.LogGroup(this, 'FlowLogs', {
      retention: config.network.flowLogRetentionDays,
      removalPolicy: config.retainData ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(config.network.cidr),
      availabilityZones: [...config.availabilityZones],
      natGateways: config.natGateways,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 22 },
        { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 20 },
        { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
      flowLogs: {
        all: {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogs),
          trafficType: ec2.FlowLogTrafficType.ALL,
        },
      },
    });

    this.vpc.addGatewayEndpoint('S3', { service: ec2.GatewayVpcEndpointAwsService.S3 });
    const interfaceEndpoints: Record<string, ec2.InterfaceVpcEndpointAwsService> = {
      EcrApi: ec2.InterfaceVpcEndpointAwsService.ECR,
      EcrDocker: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      SecretsManager: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      Logs: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      Sts: ec2.InterfaceVpcEndpointAwsService.STS,
    };
    for (const [name, service] of Object.entries(interfaceEndpoints)) {
      this.vpc.addInterfaceEndpoint(name, {
        service,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      });
    }
    acknowledge(this.vpc, [
      {
        id: 'AwsSolutions::AwsSolutions-EC23',
        reason:
          'Interface endpoint security groups admit HTTPS from the VPC CIDR only; the CIDR is a token, so the rule cannot evaluate it.',
      },
    ]);
  }
}
