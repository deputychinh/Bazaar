/** A local path to return to after sign-in; anything that could leave the site falls back. */
export const safeNextPath = (value: string | null, fallback: string): string =>
  value !== null && /^\/(?![/\\])[^\s]*$/.test(value) ? value : fallback;
