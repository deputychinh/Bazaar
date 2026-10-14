import { Match } from 'aws-cdk-lib/assertions';

import { EnvironmentName } from '../lib/enums/environment-name.enum.js';

import { buildFor, resourceCounts, templateOf } from './support/synth.js';

describe('NetworkStack', () => {
  const prod = templateOf(buildFor(EnvironmentName.Prod).network);
  const dev = templateOf(buildFor(EnvironmentName.Dev).network);

  it('spreads public, private and isolated subnets over three AZs', () => {
    prod.resourceCountIs('AWS::EC2::Subnet', 9);
  });

  it('has one NAT gateway per AZ in prod and a single one in dev', () => {
    prod.resourceCountIs('AWS::EC2::NatGateway', 3);
    dev.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  it('gives isolated subnets no route to the internet', () => {
    const routes = prod.findResources('AWS::EC2::Route');
    const tables = prod.findResources('AWS::EC2::RouteTable', {
      Properties: {
        Tags: Match.arrayWith([{ Key: 'Name', Value: Match.stringLikeRegexp('isolatedSubnet') }]),
      },
    });
    const isolatedTableIds = Object.keys(tables);
    expect(isolatedTableIds).toHaveLength(3);
    for (const route of Object.values(routes)) {
      const tableRef = (route.Properties as { RouteTableId: { Ref: string } }).RouteTableId.Ref;
      expect(isolatedTableIds).not.toContain(tableRef);
    }
  });

  it('logs all traffic', () => {
    prod.hasResourceProperties('AWS::EC2::FlowLog', { TrafficType: 'ALL' });
  });

  it('reaches S3, ECR, Secrets Manager, CloudWatch Logs and STS without the NAT', () => {
    prod.resourceCountIs('AWS::EC2::VPCEndpoint', 6);
    prod.hasResourceProperties('AWS::EC2::VPCEndpoint', { VpcEndpointType: 'Gateway' });
  });

  it('matches the resource inventory', () => {
    expect(resourceCounts(buildFor(EnvironmentName.Prod).network)).toMatchSnapshot();
  });
});
