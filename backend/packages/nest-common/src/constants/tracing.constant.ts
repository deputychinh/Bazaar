/** OTLP endpoint variable (standard OpenTelemetry name); tracing is off when it is unset. */
export const OTLP_ENDPOINT_ENV = 'OTEL_EXPORTER_OTLP_ENDPOINT';
/** Probe and scrape traffic would drown real traces. */
export const UNTRACED_PATH_PREFIXES = ['/health', '/metrics'] as const;
export const TRACER_NAME = '@bazaar/nest-common';
