import { TokenUtil } from './token.util.js';

describe('TokenUtil', () => {
  it('generates unguessable url-safe tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => TokenUtil.generate()));

    expect(tokens.size).toBe(100);
    expect([...tokens][0]).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashes deterministically with SHA-256', () => {
    expect(TokenUtil.hash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
