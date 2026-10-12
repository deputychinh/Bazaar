import '@/styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { router } from '@/app/router';
import { initialLocale } from '@/i18n/i18n';

const root = document.getElementById('root');
if (root === null) throw new Error('#root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <AppProviders locale={initialLocale()}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
