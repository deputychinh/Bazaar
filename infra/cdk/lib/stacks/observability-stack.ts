import { Duration, Stack } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import type { Construct } from 'constructs';

import { alarmTopic } from '../alerting.js';
import {
  ALARM_PERIOD_MINUTES,
  AURORA_CPU_PERCENT,
  CACHE_CPU_PERCENT,
  CACHE_MEMORY_PERCENT,
  CONSUMER_SUBSCRIPTIONS,
  MAX_CONSUMER_LAG,
  NODE_CPU_PERCENT,
} from '../constants/observability.constant.js';
import { PROJECT_NAME } from '../constants/project.constant.js';
import type { ObservabilityStackProps } from '../interfaces/observability-stack-props.interface.js';

/**
 * Regional alarms and the operations dashboard (plan §9A.2 ObservabilityStack): Aurora CPU, Kafka
 * consumer lag per group and topic, Valkey CPU/memory, EKS node CPU (Container Insights). Edge
 * 5xx and latency live in EdgeMonitoringStack, because CloudFront metrics exist in us-east-1 only.
 */
export class ObservabilityStack extends Stack {
  public readonly alarms: cloudwatch.Alarm[] = [];

  public constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);
    const { config } = props;
    const topic = alarmTopic(this, config);
    const period = Duration.minutes(ALARM_PERIOD_MINUTES);
    const alarm = (
      name: string,
      metric: cloudwatch.IMetric,
      threshold: number,
      description: string,
    ): cloudwatch.Alarm => {
      const created = new cloudwatch.Alarm(this, name, {
        alarmName: `${PROJECT_NAME}-${config.name}-${name}`,
        alarmDescription: `${description} Runbook: docs/runbook.md#${name.toLowerCase()}`,
        metric,
        threshold,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      created.addAlarmAction(new actions.SnsAction(topic));
      created.addOkAction(new actions.SnsAction(topic));
      this.alarms.push(created);
      return created;
    };

    const auroraCpu = alarm(
      'AuroraCpu',
      props.aurora.metricCPUUtilization({ period }),
      AURORA_CPU_PERCENT,
      'Aurora writer CPU is high.',
    );

    const clusterName = props.kafka.clusterName;
    const lagAlarms = Object.entries(CONSUMER_SUBSCRIPTIONS).flatMap(([group, topics]) =>
      topics.map((kafkaTopic) =>
        alarm(
          `KafkaLag-${group}-${kafkaTopic.replaceAll('.', '-')}`,
          new cloudwatch.Metric({
            namespace: 'AWS/Kafka',
            metricName: 'SumOffsetLag',
            dimensionsMap: {
              'Cluster Name': clusterName,
              'Consumer Group': group,
              Topic: kafkaTopic,
            },
            statistic: 'Maximum',
            period,
          }),
          MAX_CONSUMER_LAG,
          `Consumer group ${group} is behind on ${kafkaTopic}.`,
        ),
      ),
    );

    const cacheDimensions = { ReplicationGroupId: props.cache.ref };
    const cacheCpu = alarm(
      'CacheCpu',
      new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'EngineCPUUtilization',
        dimensionsMap: cacheDimensions,
        statistic: 'Average',
        period,
      }),
      CACHE_CPU_PERCENT,
      'Valkey engine CPU is high.',
    );
    const cacheMemory = alarm(
      'CacheMemory',
      new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'DatabaseMemoryUsagePercentage',
        dimensionsMap: cacheDimensions,
        statistic: 'Average',
        period,
      }),
      CACHE_MEMORY_PERCENT,
      'Valkey memory is nearly full.',
    );

    const nodeCpu = alarm(
      'NodeCpu',
      new cloudwatch.Metric({
        namespace: 'ContainerInsights',
        metricName: 'node_cpu_utilization',
        dimensionsMap: { ClusterName: props.clusterName },
        statistic: 'Average',
        period,
      }),
      NODE_CPU_PERCENT,
      'EKS nodes are busy; check the HPAs and node group size.',
    );

    new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${PROJECT_NAME}-${config.name}`,
      widgets: [
        [new cloudwatch.AlarmStatusWidget({ title: 'Alarms', alarms: this.alarms, width: 24 })],
        [
          new cloudwatch.GraphWidget({ title: 'Aurora CPU', left: [auroraCpu.metric], width: 8 }),
          new cloudwatch.GraphWidget({
            title: 'Valkey CPU / memory',
            left: [cacheCpu.metric, cacheMemory.metric],
            width: 8,
          }),
          new cloudwatch.GraphWidget({ title: 'EKS node CPU', left: [nodeCpu.metric], width: 8 }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Kafka consumer lag',
            left: lagAlarms.map((lag) => lag.metric),
            width: 24,
          }),
        ],
      ],
    });
  }
}
