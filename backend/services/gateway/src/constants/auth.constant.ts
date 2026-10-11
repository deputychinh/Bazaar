export const REFRESH_COOKIE_NAME = 'bazaar_refresh';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
/**
 * Readable by scripts and holds no secret: it only tells the site a refresh cookie probably
 * exists, so anonymous visitors skip a refresh call that would fail with 401.
 */
export const SESSION_HINT_COOKIE_NAME = 'bazaar_session';
export const OPAQUE_TOKEN_BYTES = 32;
export const JWT_ALGORITHM = 'RS256';
export const JWT_KEY_ID = 'bazaar-gateway-1';
export const JWKS_PATH = '.well-known/jwks.json';
/** Verified when the email is unknown so a login takes the same time either way. */
export const TIMING_SAFE_DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$TZVhkW9wiNQkPJw7+Oy5Xg$nTVchdfZFLbUui/2fxTnn+LbhYN4SKYopWHag/Jup3Q';
/** `Algorithm.Argon2id` of @node-rs/argon2 (a const enum, unusable with isolatedModules). */
export const ARGON2ID_ALGORITHM = 2;
