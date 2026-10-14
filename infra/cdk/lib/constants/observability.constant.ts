/** Alarm thresholds (plan §9A.2 ObservabilityStack, SLOs in plan §9.3). */
export const ALARM_PERIOD_MINUTES = 5;
export const AURORA_CPU_PERCENT = 80;
export const CACHE_CPU_PERCENT = 75;
export const CACHE_MEMORY_PERCENT = 80;
/** Messages a consumer group may lag behind before someone is paged (plan §9.3: 1,000 for 5 min). */
export const MAX_CONSUMER_LAG = 1000;
export const NODE_CPU_PERCENT = 80;
export const EDGE_5XX_RATE_PERCENT = 1;
/** p95 origin latency budget for CloudFront → ALB (gateway SLO p95 < 200 ms plus network). */
export const EDGE_ORIGIN_P95_MS = 500;
/**
 * What each service consumes (backend *_CONSUMER_GROUP constants and event-consumer runners):
 * one lag alarm per group and topic.
 */
export const CONSUMER_SUBSCRIPTIONS: Readonly<Record<string, readonly string[]>> = {
  catalog: ['identity.events', 'order.events'],
  order: ['inventory.events'],
  notification: ['identity.events', 'order.events', 'inventory.events', 'catalog.events'],
};
