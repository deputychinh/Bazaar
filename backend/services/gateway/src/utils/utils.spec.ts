import { UserRole } from '@bazaar/contracts';

import { EnumUtil } from './enum.util.js';
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

describe('EnumUtil', () => {
  it('returns a known value as the enum member', () => {
    expect(EnumUtil.parse(UserRole, 'SELLER')).toBe(UserRole.Seller);
  });

  it('throws on data that is not in the enum', () => {
    expect(() => EnumUtil.parse(UserRole, 'KING')).toThrow('Unknown enum value "KING"');
  });
});
