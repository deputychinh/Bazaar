import { EventType, Locale, UserStatus } from '@bazaar/contracts';
import { FixedClock } from '@bazaar/nest-common';

import {
  FakePasswordHasher,
  ImmediateTransactionManager,
  InMemoryUsersRepository,
  InMemoryUserTokensRepository,
  NOW,
  RecordingOutbox,
  testConfig,
  tokenFromLink,
} from '../../../../test/fakes/auth.fakes.js';
import { EmailAlreadyRegisteredError } from '../errors/email-already-registered.error.js';
import { InvalidTokenError } from '../errors/invalid-token.error.js';

import { AuthLinkBuilder } from './auth-link.builder.js';
import { RegistrationService } from './registration.service.js';

const DAY_MS = 86_400_000;

describe('RegistrationService', () => {
  let users: InMemoryUsersRepository;
  let userTokens: InMemoryUserTokensRepository;
  let outbox: RecordingOutbox;
  let clock: FixedClock;
  let service: RegistrationService;

  beforeEach(() => {
    users = new InMemoryUsersRepository();
    userTokens = new InMemoryUserTokensRepository();
    outbox = new RecordingOutbox();
    clock = new FixedClock(NOW);
    service = new RegistrationService(
      users,
      userTokens,
      new FakePasswordHasher(),
      outbox,
      new ImmediateTransactionManager(),
      new AuthLinkBuilder(testConfig()),
      clock,
    );
  });

  it('creates an unverified shopper and announces it with a verification link', async () => {
    const user = await service.register({
      email: 'linh@bazaar.test',
      password: 'Correct-Horse-9',
      preferredLocale: Locale.Vi,
    });

    expect(user).toMatchObject({
      status: UserStatus.PendingVerification,
      passwordHash: 'hashed:Correct-Horse-9',
    });
    expect(outbox.events.map((event) => event.type)).toEqual([
      EventType.UserRegistered,
      EventType.EmailVerificationRequested,
    ]);
    const link = new URL((outbox.events[1]?.payload as { link: string }).link);
    expect(link.origin + link.pathname).toBe('https://bazaar.test/vi/verify-email');
    expect(userTokens.rows[0]?.tokenHash).not.toBe(link.searchParams.get('token'));
  });

  it('refuses an email that is already registered', async () => {
    users.seed({ email: 'taken@bazaar.test' });

    await expect(
      service.register({
        email: 'taken@bazaar.test',
        password: 'Correct-Horse-9',
        preferredLocale: Locale.En,
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });

  it('activates the account with the emailed token, only once', async () => {
    const user = await service.register({
      email: 'a@bazaar.test',
      password: 'Correct-Horse-9',
      preferredLocale: Locale.En,
    });
    const token = tokenFromLink(outbox.events[1]);

    await service.verifyEmail(token);

    expect(users.rows.get(user.id)).toMatchObject({
      status: UserStatus.Active,
      emailVerifiedAt: NOW,
    });
    await expect(service.verifyEmail(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects an expired or unknown verification token', async () => {
    await service.register({
      email: 'b@bazaar.test',
      password: 'Correct-Horse-9',
      preferredLocale: Locale.En,
    });
    clock.advanceBy(DAY_MS + 1);

    await expect(service.verifyEmail(tokenFromLink(outbox.events[1]))).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
    await expect(service.verifyEmail('x'.repeat(43))).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('resends a verification link only to accounts still waiting for one', async () => {
    users.seed({ email: 'waiting@bazaar.test', status: UserStatus.PendingVerification });
    users.seed({ email: 'done@bazaar.test', status: UserStatus.Active });

    await service.resendVerification('waiting@bazaar.test');
    await service.resendVerification('done@bazaar.test');
    await service.resendVerification('nobody@bazaar.test');

    expect(outbox.events).toHaveLength(1);
    expect(outbox.events[0]?.type).toBe(EventType.EmailVerificationRequested);
  });
});
