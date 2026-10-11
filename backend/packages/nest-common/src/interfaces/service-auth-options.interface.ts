export interface ServiceAuthModuleOptions {
  /** Gateway public keys, e.g. http://gateway:4000/.well-known/jwks.json */
  jwksUrl: string;
  issuer: string;
  audience: string;
  /** Shared key for @Internal() routes; when unset those routes always answer 403. */
  internalApiKey?: string;
}
