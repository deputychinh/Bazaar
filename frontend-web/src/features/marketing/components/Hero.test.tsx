import { render, screen } from '@testing-library/react';

import { Hero } from './Hero';

describe('Hero', () => {
  it('shows the page heading, lead and optional actions', () => {
    render(
      <Hero
        title="Sell on Bazaar"
        lead="Open a shop."
        actions={<button type="button">Start</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Sell on Bazaar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });
});
