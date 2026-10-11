'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent, type ReactElement } from 'react';

import { ErrorCode } from '@/api/gateway.schema';
import { Button } from '@/components/Button/Button';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { TextField } from '@/components/TextField/TextField';
import { TEST_CARDS } from '@/constants/checkout.constant';
import { AlertTone } from '@/enums/alert-tone.enum';
import { useAccessToken } from '@/features/auth/useAccessToken';
import { useCart } from '@/features/cart/useCart';
import { Price } from '@/features/currency/components/Price';
import { Link, useRouter } from '@/i18n/navigation';
import type { CartProblemLine } from '@/interfaces/order.interface';
import { groupByShop } from '@/utils/cart.util';
import { pickLocalized } from '@/utils/localized-text.util';

import { placeOrder } from '../order-api';

import './CheckoutView.css';

/**
 * Review and pay. One Idempotency-Key per checkout page: pressing "Place order" again after a
 * network error retries the same order instead of buying twice.
 */
export const CheckoutView = (): ReactElement => {
  const accessToken = useAccessToken();
  const t = useTranslations('checkout');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const { lines, subtotalUsdCents, isReady, clear } = useCart();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [cardNumber, setCardNumber] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [problems, setProblems] = useState<CartProblemLine[]>([]);

  if (!isReady) return <p role="status">{t('loading')}</p>;
  if (lines.length === 0) {
    return <EmptyState title={t('empty')} action={<Link href="/search">{t('browse')}</Link>} />;
  }

  const titleOf = (slug: string, sku: string): string => {
    const line = lines.find((candidate) => candidate.productSlug === slug && candidate.sku === sku);
    return line === undefined ? sku : pickLocalized(line.title, locale);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsPending(true);
    const result = await placeOrder({
      accessToken,
      idempotencyKey,
      request: {
        lines: lines.map((line) => ({
          productSlug: line.productSlug,
          variantSku: line.sku,
          quantity: line.quantity,
        })),
        card: { number: cardNumber.replace(/\s/g, '') },
      },
    });
    setIsPending(false);
    if (result.order !== null) {
      clear();
      router.replace(`/orders/${result.order.id}`);
      return;
    }
    setErrorCode(result.errorCode);
    setProblems(result.problems);
  };

  return (
    <div className="checkout-view">
      <section className="checkout-view__summary" aria-labelledby="checkout-summary">
        <h2 id="checkout-summary" className="checkout-view__heading">
          {t('summary')}
        </h2>
        {groupByShop(lines).map((group) => (
          <div key={group.shop.slug} className="checkout-view__shop">
            <h3 className="checkout-view__shop-name">{group.shop.name}</h3>
            <ul className="checkout-view__lines">
              {group.lines.map((line) => (
                <li key={line.sku} className="checkout-view__line">
                  <span>
                    {line.quantity} × {pickLocalized(line.title, locale)} ·{' '}
                    {pickLocalized(line.variantLabel, locale)}
                  </span>
                  <Price usdCents={line.unitPriceUsdCents * line.quantity} />
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="checkout-view__total">
          {t('total')} <Price usdCents={subtotalUsdCents} isLarge />
        </p>
        <p className="checkout-view__note">{t('chargedInUsd')}</p>
      </section>
      <form className="checkout-view__payment stack" onSubmit={(event) => void handleSubmit(event)}>
        <h2 className="checkout-view__heading">{t('payment')}</h2>
        {errorCode !== null && (
          <FormAlert tone={AlertTone.Error}>
            <p>{tErrors(errorCode)}</p>
            {problems.length > 0 && (
              <ul>
                {problems.map((problem) => (
                  <li key={`${problem.productSlug}/${problem.variantSku}`}>
                    {titleOf(problem.productSlug, problem.variantSku)}:{' '}
                    {t(`problems.${problem.problem}`, { stock: problem.stock ?? 0 })}
                  </li>
                ))}
              </ul>
            )}
            {errorCode === ErrorCode.CART_CHANGED && <Link href="/cart">{t('backToCart')}</Link>}
          </FormAlert>
        )}
        <TextField
          label={t('cardNumber')}
          name="cardNumber"
          inputMode="numeric"
          autoComplete="cc-number"
          required
          minLength={12}
          maxLength={23}
          value={cardNumber}
          onChange={(event) => setCardNumber(event.target.value)}
          hint={t('testCards', TEST_CARDS)}
        />
        <Button type="submit" isFullWidth disabled={isPending}>
          {isPending ? t('placing') : t('placeOrder')}
        </Button>
      </form>
    </div>
  );
};
