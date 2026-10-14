import { type App, Validations } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import type { IConstruct } from 'constructs';

import type { NagAcknowledgement } from '../interfaces/nag-acknowledgement.interface.js';

/** cdk-nag AwsSolutions as a policy-validation plugin on every synth (plan §9A.4). */
export const applyNag = (app: App): void => {
  Validations.of(app).addPlugins(
    new AwsSolutionsChecks(app, { verbose: true, writeSuppressionsToCloudFormation: true }),
  );
};

/** Accepts specific findings on a construct; every acknowledgement carries its reason. */
export const acknowledge = (
  construct: IConstruct,
  acknowledgements: readonly NagAcknowledgement[],
): void => {
  for (const acknowledgement of acknowledgements) {
    Validations.of(construct).acknowledge(acknowledgement);
  }
};
