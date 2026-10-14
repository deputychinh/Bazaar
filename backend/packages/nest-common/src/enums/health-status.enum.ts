export enum HealthStatus {
  Up = 'up',
  Down = 'down',
  /** A non-critical dependency is down; the service still serves (readiness stays green). */
  Degraded = 'degraded',
}
