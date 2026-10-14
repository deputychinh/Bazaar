import { Duration, Stack } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import type { Construct } from 'constructs';

import { alarmTopic } from '../alerting.js';
import {
  ALARM_PERIOD_MINUTES,
  EDGE_5XX_RATE_PERCENT,
  EDGE_ORIGIN_P95_MS,
} from '../constants/observability.constant.js';
import { PROJECT_NAME } from '../constants/project.constant.js';
import type { EdgeMonitoringStackProps } from '../interfaces/edge-monitoring-stack-props.interface.js';

/**
 * What users feel, measured at the edge (plan §9A.2: 5xx rate, p95 latency): CloudFront metrics
 * exist in us-east-1 only, so these alarms and their topic live there.
 */
export class EdgeMonitoringStack extends Stack {
  public readonly alarms: cloudwatch.Alarm[] = [];

  public constructor(scope: Construct, id: string, props: EdgeMonitoringStackProps) {
    super(scope, id, { ...props, crossRegionReferences: true });
    const { config } = props;
    const topic = alarmTopic(this, config);
    const period = Duration.minutes(ALARM_PERIOD_MINUTES);

    for (const [label, distribution] of Object.entries(props.distributions)) {
      const watch = (
        name: string,
        metric: cloudwatch.IMetric,
        threshold: number,
        description: string,
      ): void => {
        const created = new cloudwatch.Alarm(this, `${label}-${name}`, {
          alarmName: `${PROJECT_NAME}-${config.name}-${label}-${name}`,
          alarmDescription: `${description} Runbook: docs/runbook.md#edge-${name.toLowerCase()}`,
          metric,
          threshold,
          evaluationPeriods: 2,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        created.addAlarmAction(new actions.SnsAction(topic));
        created.addOkAction(new actions.SnsAction(topic));
        this.alarms.push(created);
      };
      watch(
        '5xx',
        distribution.metric5xxErrorRate({ period }),
        EDGE_5XX_RATE_PERCENT,
        `More than ${EDGE_5XX_RATE_PERCENT}% of ${label} requests fail with 5xx.`,
      );
      watch(
        'OriginLatency',
        distribution.metricOriginLatency({ period, statistic: 'p95' }),
        EDGE_ORIGIN_P95_MS,
        `p95 origin latency of ${label} is above ${EDGE_ORIGIN_P95_MS} ms.`,
      );
    }
  }
}
