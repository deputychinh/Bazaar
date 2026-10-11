import { REFRESH_TOKEN_TTL_DAYS, UserStatus } from '@bazaar/contracts';
import { UnauthenticatedError } from '@bazaar/nest-common';

import {
  buildAccessTokenService,
  FakePasswordHasher,
  ImmediateTransactionManager,
  InMemoryRefreshTokensRepository,
  InMemoryUsersRepository,
} from '../../../../test/fakes/auth.fakes.js';
import { TIMING_SAFE_DUMMY_HASH } from '../../../constants/auth.constant.js';
import { AccountSuspendedError } from '../errors/account-suspended.error.js';
import { EmailNotVerifiedError } from '../errors/email-not-verified.error.js';
import { InvalidCredentialsError } from '../errors/invalid-credentials.error.js';

import { SessionService } from './session.service.js';

const DAY_MS = 86_400_000;

describe('SessionService', () => {
  let users: InMemoryUsersRepository;
  let refreshTokens: InMemoryRefreshTokensRepository;
  let hasher: FakePasswordHasher;
  let service: SessionService;
  let advanceBy: (ms: number) => void;

  beforeEach(async () => {
    users = new InMemoryUsersRepository();
    refreshTokens = new InMemoryRefreshTokensRepository();
    hasher = new FakePasswordHasher();
    const tokens = await buildAccessTokenService();
    advanceBy = (ms) => tokens.clock.advanceBy(ms);
    service = new SessionService(
      users,
      refreshTokens,
      hasher,
      tokens.service,
      new ImmediateTransactionManager(),
      tokens.clock,
    );
  });

  it('signs in with the right password and stores only a hash of the refresh token', async () => {
    const user = users.seed({ email: 'tom@bazaar.test' });

    const session = await service.login({ email: 'tom@bazaar.test', password: 'Correct-Horse-9' });

    expect(session.user.id).toBe(user.id);
    expect(session.accessToken.split('.')).toHaveLength(3);
    expect(refreshTokens.rows).toHaveLength(1);
    expect(refreshTokens.rows[0]?.tokenHash).not.toBe(session.refreshToken);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    users.seed({ email: 'tom@bazaar.test' });

    await expect(
      service.login({ email: 'tom@bazaar.test', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(
      service.login({ email: 'ghost@bazaar.test', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(hasher.verified).toContain(TIMING_SAFE_DUMMY_HASH);
  });

  it('refuses unverified and suspended accounts', async () => {
    users.seed({ email: 'new@bazaar.test', status: UserStatus.PendingVerification });
    users.seed({ email: 'bad@bazaar.test', status: UserStatus.Suspended });

    await expect(
      service.login({ email: 'new@bazaar.test', password: 'Correct-Horse-9' }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedError);
    await expect(
      service.login({ email: 'bad@bazaar.test', password: 'Correct-Horse-9' }),
    ).rejects.toBeInstanceOf(AccountSuspendedError);
  });

  it('rotates the refresh token within the same family', async () => {
    users.seed({ email: 'tom@bazaar.test' });
    const first = await service.login({ email: 'tom@bazaar.test', password: 'Correct-Horse-9' });

    const second = await service.refresh(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(refreshTokens.rows[0]?.revokedAt).not.toBeNull();
    expect(refreshTokens.rows[1]).toMatchObject({
      familyId: refreshTokens.rows[0]?.familyId,
      revokedAt: null,
    });
  });

  it('revokes the whole family when a rotated token is used again', async () => {
    users.seed({ email: 'tom@bazaar.test' });
    const first = await service.login({ email: 'tom@bazaar.test', password: 'Correct-Horse-9' });
    const second = await service.refresh(first.refreshToken);

    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(service.refresh(second.refreshToken)).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(refreshTokens.rows.every((token) => token.revokedAt !== null)).toBe(true);
  });

  it('refuses unknown and expired refresh tokens', async () => {
    users.seed({ email: 'tom@bazaar.test' });
    const session = await service.login({ email: 'tom@bazaar.test', password: 'Correct-Horse-9' });
    advanceBy(REFRESH_TOKEN_TTL_DAYS * DAY_MS + 1);

    await expect(service.refresh('unknown-token')).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(service.refresh(session.refreshToken)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  it('logs out by revoking the token family, and ignores a missing cookie', async () => {
    users.seed({ email: 'tom@bazaar.test' });
    const session = await service.login({ email: 'tom@bazaar.test', password: 'Correct-Horse-9' });

    await service.logout(undefined);
    await service.logout(session.refreshToken);

    await expect(service.refresh(session.refreshToken)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });
});
