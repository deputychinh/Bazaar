export enum FxProviderKind {
  /** Live rates from FX_API_URL, falling back to the last good value. */
  Http = 'http',
  /** Fixed rate from FX_STATIC_USD_VND: offline development and tests. */
  Static = 'static',
}
