export enum RateLimitPolicy {
  /** Every route not marked otherwise. */
  Default = 'DEFAULT',
  /** Credential and email endpoints: slows down guessing and spam. */
  Strict = 'STRICT',
}
