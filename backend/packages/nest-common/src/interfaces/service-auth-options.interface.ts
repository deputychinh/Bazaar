export interface ServiceAuthModuleOptions {
  /** Gateway public keys, e.g. http://gateway:4000/.well-known/jwks.json */
  jwksUrl: string;
  issuer: string;
  audience: string;
}
