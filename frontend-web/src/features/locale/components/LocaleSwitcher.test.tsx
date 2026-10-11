import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test-utils/render-with-providers';

import { LocaleSwitcher } from './LocaleSwitcher';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/p/non-la',
  useRouter: () => ({ replace }),
}));

describe('LocaleSwitcher', () => {
  it('reopens the same page in the chosen language', async () => {
    renderWithProviders(<LocaleSwitcher />);

    await userEvent.selectOptions(screen.getByLabelText('Language'), 'vi');

    expect(replace).toHaveBeenCalledWith('/p/non-la', { locale: 'vi' });
  });
});
