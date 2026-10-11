import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

/** Compares secrets in constant time; hashing first makes lengths equal and hides them. */
export const secretsMatch = (given: string, expected: string): boolean =>
  timingSafeEqual(digest(given), digest(expected));
