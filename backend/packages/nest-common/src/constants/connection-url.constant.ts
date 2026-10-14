/** Accepted connection URL schemes: plain locally, TLS / SRV on managed services (plan §9A.1). */
export const REDIS_URL_PATTERN = /^rediss?:\/\//;
export const MONGODB_URL_PATTERN = /^mongodb(\+srv)?:\/\//;
