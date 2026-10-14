import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

import {
  ECR_MAX_TAGGED_IMAGES,
  ECR_UNTAGGED_EXPIRY_DAYS,
  GITHUB_OIDC_URL,
  GITHUB_REPOSITORY,
  IMAGE_NAMES,
  PROJECT_NAME,
} from '../constants/project.constant.js';
import { acknowledge } from '../aspects/nag.js';
import type { BazaarStackProps } from '../interfaces/bazaar-stack-props.interface.js';

/**
 * Image registry and the identity CI deploys with (plan §9A.2 CiStack): one ECR repository per
 * image and a GitHub OIDC role — no long-lived access keys anywhere.
 */
export class CiStack extends Stack {
  public readonly repositories: ReadonlyMap<string, ecr.Repository>;
  public readonly deployRole: iam.Role;

  public constructor(scope: Construct, id: string, props: BazaarStackProps) {
    super(scope, id, props);
    const { config } = props;

    const repositories = new Map<string, ecr.Repository>();
    for (const name of IMAGE_NAMES) {
      repositories.set(
        name,
        new ecr.Repository(this, `Repo-${name}`, {
          repositoryName: `${PROJECT_NAME}/${name}`,
          imageScanOnPush: true,
          // Tag = git sha: a tag never moves, so what ran is always what was scanned.
          imageTagMutability: ecr.TagMutability.IMMUTABLE,
          encryption: ecr.RepositoryEncryption.KMS,
          removalPolicy: config.retainData ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
          emptyOnDelete: !config.retainData,
          lifecycleRules: [
            {
              description: 'Drop untagged layers',
              tagStatus: ecr.TagStatus.UNTAGGED,
              maxImageAge: Duration.days(ECR_UNTAGGED_EXPIRY_DAYS),
            },
            {
              description: 'Keep the most recent releases',
              tagStatus: ecr.TagStatus.ANY,
              maxImageCount: ECR_MAX_TAGGED_IMAGES,
            },
          ],
        }),
      );
    }
    this.repositories = repositories;

    const provider = new iam.OpenIdConnectProvider(this, 'GithubOidc', {
      url: GITHUB_OIDC_URL,
      clientIds: ['sts.amazonaws.com'],
    });

    // Only workflows of this repository on main (or the prod environment) may assume the role.
    this.deployRole = new iam.Role(this, 'DeployRole', {
      roleName: `${PROJECT_NAME}-${config.name}-github-deploy`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
        StringLike: {
          'token.actions.githubusercontent.com:sub': [
            `repo:${GITHUB_REPOSITORY}:ref:refs/heads/main`,
            `repo:${GITHUB_REPOSITORY}:environment:${config.name}`,
          ],
        },
      }),
    });

    // Push images: GetAuthorizationToken is account-wide by design; pushes are limited to our repos.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({ actions: ['ecr:GetAuthorizationToken'], resources: ['*'] }),
    );
    for (const repository of repositories.values()) {
      repository.grantPullPush(this.deployRole);
    }
    // `cdk deploy` goes through the bootstrap roles; the deploy role may only assume those.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
      }),
    );
    acknowledge(this.deployRole, [
      {
        id: 'AwsSolutions::AwsSolutions-IAM5[Resource::*]',
        reason: 'ecr:GetAuthorizationToken has no resource-level permissions (AWS docs).',
      },
      {
        id: `AwsSolutions::AwsSolutions-IAM5[Resource::arn:aws:iam::${config.account}:role/cdk-*]`,
        reason:
          'CDK bootstrap roles (deploy, file/image publishing, lookup) share the cdk-* prefix.',
      },
    ]);
  }
}
