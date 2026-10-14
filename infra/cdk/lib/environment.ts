import { type App, Tags } from 'aws-cdk-lib';

import { PROJECT_NAME } from './constants/project.constant.js';
import type { EnvironmentConfig } from './interfaces/environment-config.interface.js';
import { CiStack } from './stacks/ci-stack.js';
import { NetworkStack } from './stacks/network-stack.js';

/** The stacks of one environment, wired together (plan §9A.2). */
export interface EnvironmentStacks {
  readonly ci: CiStack;
  readonly network: NetworkStack;
}

const stackName = (config: EnvironmentConfig, part: string): string =>
  `${PROJECT_NAME}-${config.name}-${part}`;

export const buildEnvironment = (app: App, config: EnvironmentConfig): EnvironmentStacks => {
  const env = { account: config.account, region: config.region };
  const props = { env, config };

  const ci = new CiStack(app, stackName(config, 'ci'), props);
  const network = new NetworkStack(app, stackName(config, 'network'), props);

  for (const stack of [ci, network]) {
    Tags.of(stack).add('env', config.name);
  }
  return { ci, network };
};
