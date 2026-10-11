/** Outcome of looking up a presented refresh token (plan §2B Auth). */
export enum RefreshTokenState {
  Valid = 'VALID',
  Unknown = 'UNKNOWN',
  Expired = 'EXPIRED',
  Reused = 'REUSED',
}
