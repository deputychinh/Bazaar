/** A cdk-nag finding accepted on purpose, e.g. `{ id: 'AwsSolutions-IAM5[Resource::*]', reason }`. */
export interface NagAcknowledgement {
  readonly id: string;
  readonly reason: string;
}
