/** Tag values and names shared by every stack (plan §9A.2). */
export const PROJECT_NAME = 'bazaar';
export const PROJECT_OWNER = 'platform-team';
export const GITHUB_REPOSITORY = 'deputychinh/Bazaar';
export const GITHUB_OIDC_URL = 'https://token.actions.githubusercontent.com';

/** One ECR repository per image (`make images`). */
export const IMAGE_NAMES = [
  'gateway',
  'catalog',
  'order',
  'notification',
  'gateway-migrate',
  'order-migrate',
  'web',
  'admin',
] as const;

/** Untagged images are removed after this many days; tagged ones are capped by count. */
export const ECR_UNTAGGED_EXPIRY_DAYS = 7;
export const ECR_MAX_TAGGED_IMAGES = 30;
