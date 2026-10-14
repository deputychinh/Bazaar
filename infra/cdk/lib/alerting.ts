import { RemovalPolicy, type Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

import type { EnvironmentConfig } from './interfaces/environment-config.interface.js';

/** An encrypted, HTTPS-only SNS topic that emails the on-call address (one per region). */
export const alarmTopic = (stack: Stack, config: EnvironmentConfig): sns.Topic => {
  const key = new kms.Key(stack, 'AlarmKey', {
    description: 'Encrypts the alarm topic',
    enableKeyRotation: true,
    removalPolicy: RemovalPolicy.DESTROY,
  });
  // CloudWatch must be able to publish to the encrypted topic.
  key.grantEncryptDecrypt(new iam.ServicePrincipal('cloudwatch.amazonaws.com'));
  const topic = new sns.Topic(stack, 'Alarms', {
    displayName: `bazaar ${config.name} alarms`,
    masterKey: key,
    enforceSSL: true,
  });
  topic.addSubscription(new subscriptions.EmailSubscription(config.alarmEmail));
  return topic;
};
