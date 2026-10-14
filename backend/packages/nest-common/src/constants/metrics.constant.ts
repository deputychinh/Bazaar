/** Prometheus scrape endpoint, outside the API prefix and never routed by the ingress (plan §9.3). */
export const METRICS_ROUTE = 'metrics';
/** Request-duration buckets in seconds: around the 200 ms gateway SLO (NFR-03). */
export const HTTP_DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2.5, 5];
/** Route label for requests no controller matched (keeps label cardinality bounded). */
export const UNMATCHED_ROUTE = 'unmatched';
