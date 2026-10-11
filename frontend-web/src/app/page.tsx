import type { ReactElement } from 'react';

export const dynamic = 'force-static';

// TODO(BZ-036): replace with the translated landing page.
const HomePage = (): ReactElement => (
  <main className="container">
    <div className="stack">
      <h1>Bazaar</h1>
      <p>Handmade goods from independent Vietnamese makers.</p>
    </div>
  </main>
);

export default HomePage;
