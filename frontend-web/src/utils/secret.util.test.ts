import { secretsMatch } from './secret.util';

describe('secretsMatch', () => {
  it('matches only the exact secret', () => {
    expect(secretsMatch('a'.repeat(32), 'a'.repeat(32))).toBe(true);
    expect(secretsMatch('a'.repeat(31), 'a'.repeat(32))).toBe(false);
    expect(secretsMatch('', 'a'.repeat(32))).toBe(false);
  });
});
