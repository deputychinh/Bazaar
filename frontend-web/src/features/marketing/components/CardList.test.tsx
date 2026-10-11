import { render, screen } from '@testing-library/react';

import { CardList } from './CardList';

const items = [
  { title: 'Create an account', text: 'Sign up.' },
  { title: 'Get paid', text: 'Weekly payouts.' },
];

describe('CardList', () => {
  it('renders a titled list of cards', () => {
    render(<CardList title="Why Bazaar" items={items} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Why Bazaar' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('list').tagName).toBe('UL');
  });

  it('uses an ordered list for steps', () => {
    render(<CardList title="How it works" items={items} isNumbered />);

    expect(screen.getByRole('list').tagName).toBe('OL');
  });
});
