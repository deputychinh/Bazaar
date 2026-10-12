import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactElement, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import type { Locale } from '@/api/gateway.schema';
import { createI18n } from '@/i18n/i18n';

import { createQueryClient } from './query-client';

interface AppProvidersProps {
  locale: Locale;
  children: ReactNode;
}

/** Everything the app needs around its routes: translations and server state. */
export const AppProviders = ({ locale, children }: AppProvidersProps): ReactElement => {
  const [i18n] = useState(() => createI18n(locale));
  const [queryClient] = useState(createQueryClient);
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nextProvider>
  );
};
