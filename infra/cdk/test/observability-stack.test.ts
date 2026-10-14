import { Match } from 'aws-cdk-lib/assertions';

import {
  CONSUMER_SUBSCRIPTIONS,
  MAX_CONSUMER_LAG,
} from '../lib/constants/observability.constant.js';
import { EnvironmentName } from '../lib/enums/environment-name.enum.js';

import { buildFor, templateOf } from './support/synth.js';

describe('Observability stacks', () => {
  const prod = buildFor(EnvironmentName.Prod);
  const regional = templateOf(prod.observability);
  const edge = templateOf(prod.edgeMonitoring);
  const lagAlarmCount = Object.values(CONSUMER_SUBSCRIPTIONS).flat().length;

  it('alarms on every consumer group and topic it reads', () => {
    const lagAlarms = regional.findResources('AWS::CloudWatch::Alarm', {
      Properties: { MetricName: 'SumOffsetLag', Threshold: MAX_CONSUMER_LAG },
    });
    expect(Object.keys(lagAlarms)).toHaveLength(lagAlarmCount);
  });

  it('pages through an encrypted topic and links each alarm to its runbook section', () => {
    regional.hasResourceProperties('AWS::SNS::Topic', { KmsMasterKeyId: Match.anyValue() });
    regional.hasResourceProperties('AWS::SNS::Subscription', {
      Protocol: 'email',
      Endpoint: 'oncall@bazaar.example',
    });
    regional.allResourcesProperties('AWS::CloudWatch::Alarm', {
      AlarmDescription: Match.stringLikeRegexp('Runbook: docs/runbook.md#'),
      AlarmActions: [Match.anyValue()],
    });
  });

  it('watches 5xx rate and p95 origin latency of each distribution from us-east-1', () => {
    expect(prod.edgeMonitoring.region).toBe('us-east-1');
    edge.resourceCountIs('AWS::CloudWatch::Alarm', 6);
    edge.hasResourceProperties('AWS::CloudWatch::Alarm', {
      MetricName: 'OriginLatency',
      ExtendedStatistic: 'p95',
    });
  });

  it('draws the operations dashboard', () => {
    regional.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
  });
});
