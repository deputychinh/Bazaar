import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Locale } from '@/api/gateway.schema';
import { productFixture } from '@/test-utils/product.fixture';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { ProductView } from './ProductView';

const category = { id: 'c1', slug: 'lighting', name: { en: 'Lighting', vi: 'Đèn' }, children: [] };

describe('ProductView', () => {
  it('shows the product in the visitor’s language with breadcrumbs and shop link', () => {
    renderWithProviders(<ProductView product={productFixture()} category={category} />, {
      locale: Locale.vi,
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Đèn lồng lụa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đèn' })).toHaveAttribute('href', '/c/lighting');
    expect(screen.getByRole('link', { name: 'Hội An Lights' })).toHaveAttribute(
      'href',
      '/s/hoi-an-lights',
    );
    expect(screen.getByText('Làm thủ công ở Hội An.')).toBeInTheDocument();
  });

  it('switches the main image from the thumbnails', async () => {
    renderWithProviders(<ProductView product={productFixture()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Show image 2 of 2' }));

    expect(screen.getByRole('button', { name: 'Show image 2 of 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('img', { name: 'Side view' })).toBeInTheDocument();
  });
});
