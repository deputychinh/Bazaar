/** CloudFront, WAF and DNS settings (plan §9A.1 edge rows). */
/** CloudFront certificates and WAF web ACLs must live in us-east-1. */
export const GLOBAL_REGION = 'us-east-1';
export const SUBDOMAINS = { admin: 'admin', images: 'images', origin: 'origin' } as const;
/**
 * The ALB is created by the AWS Load Balancer Controller from the Ingress, so its DNS name exists
 * only after the first rollout; the deploy pipeline writes it here (docs/aws.md).
 */
export const ALB_DNS_PARAMETER = (env: string): string => `/bazaar/${env}/edge/alb-dns-name`;
/** Requests per 5 minutes per IP before WAF blocks (on top of the gateway's own rate limits). */
export const WAF_RATE_LIMIT = 2000;
export const NEXT_STATIC_PATH = '/_next/static/*';
export const API_PATH = '/api/*';
