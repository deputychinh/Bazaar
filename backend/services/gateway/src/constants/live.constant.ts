/** Each gateway pod reads order.events with its own group (plan §2B "Live status at scale"). */
export const LIVE_CONSUMER_GROUP_PREFIX = 'gateway-live';
/** Keeps idle SSE connections open through proxies and lets clients notice a dead one. */
export const SSE_HEARTBEAT_MS = 25_000;
