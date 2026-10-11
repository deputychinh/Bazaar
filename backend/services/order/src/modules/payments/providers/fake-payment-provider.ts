import { randomUUID } from 'node:crypto';

import type { Card } from '@bazaar/contracts';
import { ValidationError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import {
  FAKE_PROVIDER_HANG_MS,
  FAKE_TOKEN_PREFIX,
  TEST_CARD_DECLINE,
  TEST_CARD_TIMEOUT,
} from '../../../constants/payment.constant.js';
import { CardBehaviour } from '../../../enums/card-behaviour.enum.js';
import type {
  ChargeRequest,
  ChargeResult,
  TokenizedCard,
} from '../../../interfaces/payment.interface.js';
import { CardUtil } from '../../../utils/card.util.js';

import { PaymentProvider } from './payment-provider.js';

/**
 * Local stand-in for a card provider. The behaviour of a test card is encoded in its token
 * (tok_fake_<behaviour>_<random>), so the charge needs nothing but the token, like a real one.
 */
@Injectable()
export class FakePaymentProvider extends PaymentProvider {
  public tokenize(card: Card): Promise<TokenizedCard> {
    if (!CardUtil.isValidNumber(card.number)) {
      return Promise.reject(
        new ValidationError('Card number is not valid', { fields: { 'card.number': 'invalid' } }),
      );
    }
    const behaviour =
      card.number === TEST_CARD_DECLINE
        ? CardBehaviour.Decline
        : card.number === TEST_CARD_TIMEOUT
          ? CardBehaviour.Timeout
          : CardBehaviour.Succeed;
    return Promise.resolve({
      token: `${FAKE_TOKEN_PREFIX}_${behaviour}_${randomUUID().slice(0, 8)}`,
      last4: CardUtil.last4(card.number),
    });
  }

  public async charge(request: ChargeRequest): Promise<ChargeResult> {
    const behaviour = request.token.split('_')[2];
    if (behaviour === CardBehaviour.Decline) {
      return { succeeded: false, failureReason: 'card_declined' };
    }
    if (behaviour === CardBehaviour.Timeout) {
      // Hangs past the caller's timeout; PaymentService gives up first (PAYMENT_CHARGE_TIMEOUT_MS).
      await new Promise((resolve) => setTimeout(resolve, FAKE_PROVIDER_HANG_MS).unref());
      return { succeeded: false, failureReason: 'provider_timeout' };
    }
    return { succeeded: true, providerRef: `ch_fake_${request.reference}` };
  }
}
