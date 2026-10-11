import { render, type RenderResult } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';

import { Locale } from '@/api/gateway.schema';
import { CartProvider } from '@/features/cart/CartProvider';
import { CurrencyProvider } from '@/features/currency/CurrencyProvider';
import en from '@/i18n/messages/en.json';
import vi from '@/i18n/messages/vi.json';

interface ProvidersProps {
  locale?: Locale;
  usdToVnd?: number | null;
}

/** Renders inside the same providers as the real layout. */
export const renderWithProviders = (
  ui: ReactElement,
  { locale = Locale.en, usdToVnd = 25_000 }: ProvidersProps = {},
): RenderResult =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === Locale.vi ? vi : en}
      timeZone="Asia/Ho_Chi_Minh"
    >
      <CurrencyProvider locale={locale} usdToVnd={usdToVnd}>
        <CartProvider>{ui}</CartProvider>
      </CurrencyProvider>
    </NextIntlClientProvider>,
  );
