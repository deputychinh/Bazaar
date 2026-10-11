import { EventType, UserStatus } from '@bazaar/contracts';
import { FixedClock } from '@bazaar/nest-common';

import {
  FakePasswordHasher,
  ImmediateTransactionManager,
  InMemoryRefreshTokensRepository,
  InMemoryUsersRepository,
  InMemoryUserTokensRepository,
  NOW,
  RecordingOutbox,
  testConfig,
  tokenFromLink,
} from '../../../../test/fakes/auth.fakes.js';
import { InvalidTokenError } from '../errors/invalid-token.error.js';

import { AuthLinkBuilder } from './auth-link.builder.js';
import { PasswordResetService } from './password-reset.service.js';

describe('PasswordResetService', () => {
  let users: InMemoryUsersRepository;
  let refreshTokens: InMemoryRefreshTokensRepository;
  let outbox: RecordingOutbox;
  let clock: FixedClock;
  let service: PasswordResetService;

  beforeEach(() => {
    users = new InMemoryUsersRepository();
    refreshTokens = new InMemoryRefreshTokensRepository();
    outbox = new RecordingOutbox();
    clock = new FixedClock(NOW);
    service = new PasswordResetService(
      users,
      new InMemoryUserTokensRepository(),
      refreshTokens,
      new FakePasswordHasher(),
      outbox,
      new ImmediateTransactionManager(),
      new AuthLinkBuilder(testConfig()),
      clock,
    );
  });

  it('emails a reset link to known, non-suspended accounts only', async () => {
    users.seed({ email: 'linh@bazaar.test' });
    users.seed({ email: 'bad@bazaar.test', status: UserStatus.Suspended });

    await service.requestReset('linh@bazaar.test');
    await service.requestReset('bad@bazaar.test');
    await service.requestReset('ghost@bazaar.test');

    expect(outbox.events.map((event) => event.type)).toEqual([EventType.PasswordResetRequested]);
    expect(tokenFromLink(outbox.events[0])).not.toBe('');
  });

  it('sets the new password and signs the user out everywhere', async () => {
    const user = users.seed({ email: 'linh@bazaar.test' });
    await refreshTokens.create({ userId: user.id, tokenHash: 'h', familyId: 'f', expiresAt: NOW });
    await service.requestReset('linh@bazaar.test');

    await service.reset({ token: tokenFromLink(outbox.events[0]), password: 'New-Password-77' });

    expect(users.rows.get(user.id)?.passwordHash).toBe('hashed:New-Password-77');
    expect(refreshTokens.rows[0]?.revokedAt).not.toBeNull();
  });

  it('also verifies an account that was still waiting for verification', async () => {
    const user = users.seed({ email: 'new@bazaar.test', status: UserStatus.PendingVerification });
    await service.requestReset('new@bazaar.test');

    await service.reset({ token: tokenFromLink(outbox.events[0]), password: 'New-Password-77' });

    expect(users.rows.get(user.id)?.status).toBe(UserStatus.Active);
  });

  it('rejects a reset token after it expires or once it was used', async () => {
    users.seed({ email: 'linh@bazaar.test' });
    await service.requestReset('linh@bazaar.test');
    const token = tokenFromLink(outbox.events[0]);
    await service.reset({ token, password: 'New-Password-77' });

    await expect(service.reset({ token, password: 'Another-Pass-88' })).rejects.toBeInstanceOf(
      InvalidTokenError,
    );

    await service.requestReset('linh@bazaar.test');
    clock.advanceBy(61 * 60_000);
    await expect(
      service.reset({ token: tokenFromLink(outbox.events[1]), password: 'Another-Pass-88' }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
