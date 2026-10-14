/** EKS settings shared by dev and prod; bump versions on purpose, never implicitly. */
export const APPS_NAMESPACE = 'bazaar';
export const EXTERNAL_SECRETS_NAMESPACE = 'external-secrets';
export const EXTERNAL_SECRETS_CHART = {
  repository: 'https://charts.external-secrets.io',
  chart: 'external-secrets',
  version: '2.12.0',
} as const;
export const NODE_DISK_SIZE_GB = 50;
/** Service accounts that get an AWS identity through EKS Pod Identity. */
export const POD_IDENTITY_ACCOUNTS = {
  catalog: 'catalog',
  notification: 'notification',
  externalSecrets: 'external-secrets',
} as const;
