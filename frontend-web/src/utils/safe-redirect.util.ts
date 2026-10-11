/**
 * The `next` page to return to after sign-in, only if it is a path on this site — never another
 * origin (`//evil.test`, `https://…`, `/\evil.test`), which would be an open redirect.
 */
export const safeNextPath = (value: string | null, fallback: string): string =>
  value !== null && /^\/(?![/\\])[^\s]*$/.test(value) ? value : fallback;
