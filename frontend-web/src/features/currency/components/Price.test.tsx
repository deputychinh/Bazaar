import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Locale } from '@/api/gateway.schema';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { CurrencySwitcher } from './CurrencySwitcher';
import { Price } from './Price';

describe('Price and CurrencySwitcher', () => {
  afterEach(() => {
    document.cookie = 'bazaar_currency=; Max-Age=0; Path=/';
  });

  it('use the locale default currency before the visitor chooses', () => {
    renderWithProviders(<Price usdCents={2000} />, { locale: Locale.vi });

    expect(screen.getByText(/500\.000/)).toBeInTheDocument();
  });

  it('switch every price when the visitor picks another currency, and remember it', async () => {
    renderWithProviders(
      <>
        <CurrencySwitcher />
        <Price usdCents={2000} />
      </>,
    );
    expect(screen.getByText('$20.00')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Currency'), 'VND');

    expect(screen.getByText(/≈/)).toHaveTextContent('500,000');
    expect(document.cookie).toContain('bazaar_currency=VND');
  });
});
