export interface MetricsModuleOptions {
  /** Value of the `service` label on every series. */
  serviceName: string;
  /** Node.js process metrics (default true; tests turn them off). */
  collectDefaults?: boolean;
}
