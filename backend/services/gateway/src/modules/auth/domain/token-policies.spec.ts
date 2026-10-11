import { RefreshTokenState } from '../../../enums/refresh-token-state.enum.js';

import { OneTimeTokenPolicy } from './one-time-token-policy.js';
import { RefreshTokenPolicy } from './refresh-token-policy.js';

const now = new Date('2026-10-11T08:00:00.000Z');
const later = new Date('2026-10-12T08:00:00.000Z');
const earlier = new Date('2026-10-10T08:00:00.000Z');

describe('RefreshTokenPolicy', () => {
  const token = { id: 't', userId: 'u', familyId: 'f', expiresAt: later, revokedAt: null };

  it.each([
    ['unknown', null, RefreshTokenState.Unknown],
    ['valid', token, RefreshTokenState.Valid],
    ['expired', { ...token, expiresAt: earlier }, RefreshTokenState.Expired],
    ['reused after rotation', { ...token, revokedAt: earlier }, RefreshTokenState.Reused],
  ])('classifies a %s token', (_label, stored, expected) => {
    expect(RefreshTokenPolicy.evaluate(stored, now)).toBe(expected);
  });
});

describe('OneTimeTokenPolicy', () => {
  const token = { id: 't', userId: 'u', expiresAt: later, usedAt: null };

  it('accepts an unused token before it expires', () => {
    expect(OneTimeTokenPolicy.isUsable(token, now)).toBe(true);
  });

  it('refuses missing, used and expired tokens', () => {
    expect(OneTimeTokenPolicy.isUsable(null, now)).toBe(false);
    expect(OneTimeTokenPolicy.isUsable({ ...token, usedAt: earlier }, now)).toBe(false);
    expect(OneTimeTokenPolicy.isUsable({ ...token, expiresAt: now }, now)).toBe(false);
  });
});
