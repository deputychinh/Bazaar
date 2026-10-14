import { synthWithNag } from './support/synth.js';

describe('cdk-nag (AwsSolutions)', () => {
  it('passes for every stack of every environment', () => {
    expect(() => synthWithNag()).not.toThrow();
  });
});
