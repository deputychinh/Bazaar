import { App, Tags } from 'aws-cdk-lib';

import { applyNag } from '../lib/aspects/nag.js';
import { ENVIRONMENTS } from '../lib/config/environments.js';
import { PROJECT_NAME, PROJECT_OWNER } from '../lib/constants/project.constant.js';
import { buildEnvironment } from '../lib/environment.js';

// Every environment is synthesized on every run, so dev and prod are always checked together.
const app = new App();
for (const config of Object.values(ENVIRONMENTS)) {
  buildEnvironment(app, config);
}
Tags.of(app).add('project', PROJECT_NAME);
Tags.of(app).add('owner', PROJECT_OWNER);
applyNag(app);
app.synth();
