import type { EnvironmentName } from '../enums/environment-name.enum.js';

/** Everything that differs between dev and prod. Stacks read sizes from here, never literals. */
export interface EnvironmentConfig {
  readonly name: EnvironmentName;
  /** Placeholder account ids: the project is synthesized, never deployed. */
  readonly account: string;
  readonly region: string;
  /** Explicit AZs keep synth offline (no context lookups). */
  readonly availabilityZones: readonly string[];
  readonly natGateways: number;
  readonly network: { readonly cidr: string; readonly flowLogRetentionDays: number };
  readonly aurora: {
    readonly minCapacityAcu: number;
    readonly maxCapacityAcu: number;
    readonly readers: number;
    readonly backupRetentionDays: number;
  };
  readonly msk: {
    readonly brokerNodes: number;
    readonly instanceType: string;
    readonly volumeSizeGb: number;
    readonly kafkaVersion: string;
  };
  readonly cache: { readonly nodeType: string; readonly replicas: number };
  readonly atlas: {
    readonly instanceSize: string;
    readonly diskSizeGb: number;
    /** SSM parameter holding the Atlas organization id (set once per account). */
    readonly orgIdParameter: string;
    /** Atlas CloudFormation profile: Secrets Manager secret `cfn/atlas/profile/<name>` with API keys. */
    readonly profile: string;
  };
  readonly eks: {
    readonly instanceType: string;
    readonly minNodes: number;
    readonly desiredNodes: number;
    readonly maxNodes: number;
  };
  /** Public domain; without one CloudFront serves its default *.cloudfront.net name. */
  readonly domainName?: string;
  readonly alarmEmail: string;
  readonly logRetentionDays: number;
  /** Prod keeps data (RETAIN + deletion protection); dev can be torn down. */
  readonly retainData: boolean;
}
