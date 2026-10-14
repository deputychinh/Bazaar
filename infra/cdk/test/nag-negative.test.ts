import { App, Stack } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { applyNag } from '../lib/aspects/nag.js';

describe('cdk-nag wiring', () => {
  it('fails synth on an unacknowledged finding', () => {
    const app = new App();
    new s3.Bucket(new Stack(app, 'Probe'), 'Open');
    applyNag(app);
    expect(() => app.synth()).toThrow();
  });
});
