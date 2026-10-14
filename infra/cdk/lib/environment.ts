import { type App, Tags } from 'aws-cdk-lib';

import { GLOBAL_REGION } from './constants/edge.constant.js';
import { PROJECT_NAME } from './constants/project.constant.js';
import type { EnvironmentConfig } from './interfaces/environment-config.interface.js';
import { CiStack } from './stacks/ci-stack.js';
import { ClusterStack } from './stacks/cluster-stack.js';
import { DataStack } from './stacks/data-stack.js';
import { EdgeGlobalStack } from './stacks/edge-global-stack.js';
import { EdgeMonitoringStack } from './stacks/edge-monitoring-stack.js';
import { EdgeStack } from './stacks/edge-stack.js';
import { NetworkStack } from './stacks/network-stack.js';
import { ObservabilityStack } from './stacks/observability-stack.js';

/** The stacks of one environment, wired together (plan §9A.2). */
export interface EnvironmentStacks {
  readonly ci: CiStack;
  readonly network: NetworkStack;
  readonly data: DataStack;
  readonly cluster: ClusterStack;
  readonly edgeGlobal: EdgeGlobalStack;
  readonly edge: EdgeStack;
  readonly observability: ObservabilityStack;
  readonly edgeMonitoring: EdgeMonitoringStack;
}

const stackName = (config: EnvironmentConfig, part: string): string =>
  `${PROJECT_NAME}-${config.name}-${part}`;

export const buildEnvironment = (app: App, config: EnvironmentConfig): EnvironmentStacks => {
  const env = { account: config.account, region: config.region };
  const props = { env, config };

  const ci = new CiStack(app, stackName(config, 'ci'), props);
  const network = new NetworkStack(app, stackName(config, 'network'), props);
  const data = new DataStack(app, stackName(config, 'data'), { ...props, vpc: network.vpc });
  const cluster = new ClusterStack(app, stackName(config, 'cluster'), {
    ...props,
    vpc: network.vpc,
    dataClientSecurityGroup: data.clientSecurityGroup,
    dataKey: data.key,
    imagesBucket: data.imagesBucket,
    secretArns: [
      `arn:aws:secretsmanager:${config.region}:${config.account}:secret:${PROJECT_NAME}/${config.name}/*`,
      data.kafkaSecret.secretArn,
    ],
    deployRole: ci.deployRole,
  });

  const edgeGlobal = new EdgeGlobalStack(app, stackName(config, 'edge-global'), {
    config,
    env: { account: config.account, region: GLOBAL_REGION },
    crossRegionReferences: true,
  });
  const edge = new EdgeStack(app, stackName(config, 'edge'), {
    ...props,
    webAclArn: edgeGlobal.webAclArn,
    ...(edgeGlobal.certificate === undefined ? {} : { certificate: edgeGlobal.certificate }),
  });
  edge.addDependency(data, 'the images bucket must exist before its CDN');

  const observability = new ObservabilityStack(app, stackName(config, 'observability'), {
    ...props,
    aurora: data.aurora,
    kafka: data.kafka,
    cache: data.cache,
    clusterName: cluster.cluster.clusterName,
  });
  const edgeMonitoring = new EdgeMonitoringStack(app, stackName(config, 'edge-monitoring'), {
    config,
    env: { account: config.account, region: GLOBAL_REGION },
    distributions: {
      web: edge.webDistribution,
      admin: edge.adminDistribution,
      images: edge.imagesDistribution,
    },
  });

  const stacks = { ci, network, data, cluster, edgeGlobal, edge, observability, edgeMonitoring };
  for (const stack of Object.values(stacks)) {
    Tags.of(stack).add('env', config.name);
  }
  return stacks;
};
