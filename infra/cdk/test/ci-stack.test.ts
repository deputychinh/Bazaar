import { Match } from 'aws-cdk-lib/assertions';

import { GITHUB_REPOSITORY, IMAGE_NAMES } from '../lib/constants/project.constant.js';
import { EnvironmentName } from '../lib/enums/environment-name.enum.js';

import { buildFor, resourceCounts, templateOf } from './support/synth.js';

describe('CiStack', () => {
  const { ci } = buildFor(EnvironmentName.Prod);
  const template = templateOf(ci);

  it('has one scanned, immutable, encrypted repository per image', () => {
    template.resourceCountIs('AWS::ECR::Repository', IMAGE_NAMES.length);
    template.allResourcesProperties('AWS::ECR::Repository', {
      ImageScanningConfiguration: { ScanOnPush: true },
      ImageTagMutability: 'IMMUTABLE',
      EncryptionConfiguration: { EncryptionType: 'KMS' },
    });
  });

  it('keeps prod repositories when the stack is deleted', () => {
    template.allResources('AWS::ECR::Repository', { DeletionPolicy: 'Retain' });
  });

  it('lets only this repository main branch or prod environment assume the deploy role', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
              StringLike: {
                'token.actions.githubusercontent.com:sub': [
                  `repo:${GITHUB_REPOSITORY}:ref:refs/heads/main`,
                  `repo:${GITHUB_REPOSITORY}:environment:prod`,
                ],
              },
            },
          }),
        ],
      },
    });
  });

  it('creates no IAM users or access keys', () => {
    template.resourceCountIs('AWS::IAM::User', 0);
    template.resourceCountIs('AWS::IAM::AccessKey', 0);
  });

  it('matches the resource inventory', () => {
    expect(resourceCounts(ci)).toMatchSnapshot();
  });
});
