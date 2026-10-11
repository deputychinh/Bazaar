import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@/styles/index.css';

import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Bazaar',
  description: 'Handmade goods from independent Vietnamese makers.',
};

interface RootLayoutProps {
  children: ReactNode;
}

// TODO(BZ-034): move under app/[locale] and set <html lang> from the route.
const RootLayout = ({ children }: RootLayoutProps): ReactElement => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
