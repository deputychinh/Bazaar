import { createHash, timingSafeEqual } from 'node:crypto';

/** Secret comparisons that do not leak through timing. */
export class SecretUtil {
  /** Hashing first gives equal lengths, so neither content nor length is revealed. */
  public static matches(given: string, expected: string): boolean {
    return timingSafeEqual(SecretUtil.digest(given), SecretUtil.digest(expected));
  }

  private static digest(value: string): Buffer {
    return createHash('sha256').update(value).digest();
  }
}
