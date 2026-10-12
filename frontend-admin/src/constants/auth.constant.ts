/** Script-readable, secret-free cookie the gateway sets beside the HttpOnly refresh cookie. */
export const SESSION_HINT_COOKIE = 'bazaar_session';
/** Web Locks name that serialises refreshes across tabs (a reused refresh token revokes the session). */
export const REFRESH_LOCK_NAME = 'bazaar-admin-auth-refresh';
/** Renew the access token when this share of its lifetime has passed. */
export const ACCESS_TOKEN_REFRESH_RATIO = 0.8;
export const API_TIMEOUT_MS = 10_000;
