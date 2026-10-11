/** Mirrors @bazaar/contracts PASSWORD_*_LENGTH; the gateway validates again. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
/** Script-readable, secret-free cookie the gateway sets beside the HttpOnly refresh cookie. */
export const SESSION_HINT_COOKIE = 'bazaar_session';
/** Web Locks name that serialises refreshes across tabs. */
export const REFRESH_LOCK_NAME = 'bazaar-auth-refresh';
