import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Locale } from '@/api/gateway.schema';
import { mockGateway } from '@/test-utils/gateway-mock';
import { renderSignedIn } from '@/test-utils/render-signed-in';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { ProductReviews } from './ProductReviews';

const review = {
  id: 'r1',
  rating: 4,
  comment: 'Lovely glaze',
  locale: Locale.en,
  createdAt: '2026-10-01T00:00:00.000Z',
};
const list = { status: 200, body: { items: [review], total: 1, page: 1, pageSize: 10 } };

describe('ProductReviews', () => {
  it('shows reviews to everyone, without a form for visitors', async () => {
    mockGateway({ 'GET /api/v1/products/vase/reviews': list });
    renderWithProviders(<ProductReviews slug="vase" />);

    expect(await screen.findByText('Lovely glaze')).toBeInTheDocument();
    expect(screen.getByLabelText('4 stars')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Post review' })).not.toBeInTheDocument();
  });

  it('lets a buyer who received the product post a review', async () => {
    const { fetchMock } = renderSignedIn(<ProductReviews slug="vase" />, {
      routes: {
        'GET /api/v1/products/vase/reviews': {
          status: 200,
          body: { items: [], total: 0, page: 1, pageSize: 10 },
        },
        'GET /api/v1/products/vase/reviews/eligibility': {
          status: 200,
          body: { canReview: true, hasReviewed: false },
        },
        'POST /api/v1/products/vase/reviews': {
          status: 201,
          body: { ...review, id: 'r2', rating: 3, comment: 'Nice' },
        },
      },
    });

    await userEvent.click(await screen.findByRole('radio', { name: '3 stars' }));
    await userEvent.type(screen.getByLabelText('Your review (optional)'), 'Nice');
    await userEvent.click(screen.getByRole('button', { name: 'Post review' }));

    expect(await screen.findByText('Thank you for your review!')).toBeInTheDocument();
    expect(screen.getByText('Nice')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Post review' })).not.toBeInTheDocument();
    const post = fetchMock.mock.calls
      .map(([call]) => call as Request)
      .find((call) => call.method === 'POST' && call.url.endsWith('/reviews'));
    expect(await post?.clone().json()).toEqual({ rating: 3, comment: 'Nice', locale: 'en' });
  });

  it('says when there are no reviews', async () => {
    mockGateway({
      'GET /api/v1/products/vase/reviews': {
        status: 200,
        body: { items: [], total: 0, page: 1, pageSize: 10 },
      },
    });
    renderWithProviders(<ProductReviews slug="vase" />);
    expect(await screen.findByText('No reviews yet.')).toBeInTheDocument();
  });
});
