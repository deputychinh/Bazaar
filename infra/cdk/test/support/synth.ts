import { readFileSync } from 'node:fs';

import { App, type Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { applyNag } from '../../lib/aspects/nag.js';
import { ENVIRONMENTS } from '../../lib/config/environments.js';
import { buildEnvironment, type EnvironmentStacks } from '../../lib/environment.js';
import type { EnvironmentName } from '../../lib/enums/environment-name.enum.js';

// Tests run with the same feature flags and cached context as `cdk synth`.
const readJson = (file: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')) as Record<
    string,
    unknown
  >;
const context = {
  ...(readJson('cdk.json').context as Record<string, unknown>),
  ...readJson('cdk.context.json'),
};
const newApp = (): App => new App({ context });

/** Builds one environment in a fresh app, the way bin/bazaar.ts does. */
export const buildFor = (name: EnvironmentName): EnvironmentStacks =>
  buildEnvironment(newApp(), ENVIRONMENTS[name]);

export const templateOf = (stack: Stack): Template => Template.fromStack(stack);

/** The whole application with cdk-nag attached; synth throws on any unacknowledged finding. */
export const synthWithNag = (): void => {
  const app = newApp();
  for (const config of Object.values(ENVIRONMENTS)) {
    buildEnvironment(app, config);
  }
  applyNag(app);
  app.synth();
};

/** Resource counts by type: a snapshot that catches added/removed resources, not asset hashes. */
export const resourceCounts = (stack: Stack): Record<string, number> => {
  const resources = templateOf(stack).toJSON().Resources as Record<string, { Type: string }>;
  const counts: Record<string, number> = {};
  for (const { Type } of Object.values(resources)) {
    counts[Type] = (counts[Type] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
};
