import { UserRole } from '@bazaar/contracts';

import { EnumUtil } from './enum.util.js';

describe('EnumUtil', () => {
  it('returns a known value as the enum member', () => {
    expect(EnumUtil.parse(UserRole, 'SELLER')).toBe(UserRole.Seller);
  });

  it('throws on data that is not in the enum', () => {
    expect(() => EnumUtil.parse(UserRole, 'KING')).toThrow('Unknown enum value "KING"');
  });
});
