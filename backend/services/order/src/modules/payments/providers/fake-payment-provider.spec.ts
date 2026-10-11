import { ValidationError } from '@bazaar/nest-common';

import { FakePaymentProvider } from './fake-payment-provider.js';

describe('FakePaymentProvider', () => {
  const provider = new FakePaymentProvider();

  it('tokenises a card without keeping its number', async () => {
    const card = await provider.tokenize({ number: '4242424242424242' });
    expect(card.last4).toBe('4242');
    expect(card.token).toMatch(/^tok_fake_succeed_/);
    expect(card.token).not.toContain('424242');
  });

  it('refuses an invalid number', async () => {
    await expect(provider.tokenize({ number: '4242424242424241' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('charges, declines or hangs according to the test card', async () => {
    const ok = await provider.tokenize({ number: '4242424242424242' });
    const declined = await provider.tokenize({ number: '4000000000000002' });

    expect(
      await provider.charge({ token: ok.token, amountUsdCents: 1500, reference: 'o1' }),
    ).toEqual({
      succeeded: true,
      providerRef: 'ch_fake_o1',
    });
    expect(
      await provider.charge({ token: declined.token, amountUsdCents: 1500, reference: 'o2' }),
    ).toEqual({
      succeeded: false,
      failureReason: 'card_declined',
    });
  });

  it('stays silent for the timeout card', async () => {
    vi.useFakeTimers();
    const hanging = await provider.tokenize({ number: '4000000000000119' });
    let settled = false;
    const charge = provider
      .charge({ token: hanging.token, amountUsdCents: 1, reference: 'o3' })
      .then((result) => {
        settled = true;
        return result;
      });

    await vi.advanceTimersByTimeAsync(5_000);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await charge).toEqual({ succeeded: false, failureReason: 'provider_timeout' });
    vi.useRealTimers();
  });
});
