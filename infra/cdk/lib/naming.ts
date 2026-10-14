import { PROJECT_NAME } from './constants/project.constant.js';
import type { EnvironmentConfig } from './interfaces/environment-config.interface.js';

/** Names other stacks need without a cross-stack reference (S3 names are global: account suffix). */
export const imagesBucketName = (config: EnvironmentConfig): string =>
  `${PROJECT_NAME}-${config.name}-images-${config.account}`;
