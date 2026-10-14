export interface TracingOptions {
  /** `service.name` of every span. */
  serviceName: string;
  /** Environment to read the OTLP endpoint from (default process.env). */
  env?: Record<string, string | undefined>;
}
