import { EnvironmentName } from '../enums/environment-name.enum.js';
import type { EnvironmentConfig } from '../interfaces/environment-config.interface.js';

const REGION = 'ap-southeast-1';
const AZS = ['ap-southeast-1a', 'ap-southeast-1b', 'ap-southeast-1c'] as const;

/** The single typed source of environment settings (plan §9A.2, DS-01 for infra). */
export const ENVIRONMENTS: Readonly<Record<EnvironmentName, EnvironmentConfig>> = {
  [EnvironmentName.Dev]: {
    name: EnvironmentName.Dev,
    account: '111111111111',
    region: REGION,
    availabilityZones: AZS,
    natGateways: 1,
    network: { cidr: '10.10.0.0/16', flowLogRetentionDays: 14 },
    aurora: { minCapacityAcu: 0.5, maxCapacityAcu: 2, readers: 0, backupRetentionDays: 1 },
    msk: {
      brokerNodes: 3,
      instanceType: 'kafka.t3.small',
      volumeSizeGb: 20,
      kafkaVersion: '3.9.x',
    },
    cache: { nodeType: 'cache.t4g.micro', replicas: 0 },
    atlas: {
      instanceSize: 'M10',
      diskSizeGb: 10,
      orgIdParameter: '/bazaar/dev/atlas/org-id',
      profile: 'bazaar-dev',
    },
    eks: { instanceType: 't4g.large', minNodes: 2, desiredNodes: 2, maxNodes: 4 },
    alarmEmail: 'oncall-dev@bazaar.example',
    logRetentionDays: 14,
    retainData: false,
  },
  [EnvironmentName.Prod]: {
    name: EnvironmentName.Prod,
    account: '222222222222',
    region: REGION,
    availabilityZones: AZS,
    natGateways: 3,
    network: { cidr: '10.20.0.0/16', flowLogRetentionDays: 90 },
    aurora: { minCapacityAcu: 1, maxCapacityAcu: 16, readers: 1, backupRetentionDays: 14 },
    msk: {
      brokerNodes: 3,
      instanceType: 'kafka.m7g.large',
      volumeSizeGb: 200,
      kafkaVersion: '3.9.x',
    },
    cache: { nodeType: 'cache.m7g.large', replicas: 1 },
    atlas: {
      instanceSize: 'M30',
      diskSizeGb: 40,
      orgIdParameter: '/bazaar/prod/atlas/org-id',
      profile: 'bazaar-prod',
    },
    eks: { instanceType: 'm7g.large', minNodes: 3, desiredNodes: 3, maxNodes: 9 },
    domainName: 'bazaar.example',
    alarmEmail: 'oncall@bazaar.example',
    logRetentionDays: 90,
    retainData: true,
  },
};
