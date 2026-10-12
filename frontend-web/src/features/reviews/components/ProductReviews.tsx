'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { AlertTone } from '@/enums/alert-tone.enum';
import { useAuth } from '@/features/auth/useAuth';
import type { ApiResult } from '@/interfaces/api-result.interface';
import type { ReviewEligibility, ReviewPage } from '@/interfaces/catalog.interface';

import { listReviews, reviewEligibility, submitReview } from '../review-api';

import './ProductReviews.css';

const STARS = [1, 2, 3, 4, 5] as const;

interface ProductReviewsProps {
  slug: string;
}

/**
 * Reviews load in the browser so the cached (ISR) product page never shows stale ones; buyers
 * who received the product get a form (plan F11).
 */
export const ProductReviews = ({ slug }: ProductReviewsProps): ReactElement => {
  const t = useTranslations('reviews');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const locale = useLocale();
  const { accessToken } = useAuth();
  const [page, setPage] = useState<ApiResult<ReviewPage> | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<{ tone: AlertTone; text: string } | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void listReviews(slug).then((answer) => {
      if (isCurrent) setPage(answer);
    });
    return () => {
      isCurrent = false;
    };
  }, [slug]);

  useEffect(() => {
    if (accessToken === null) return undefined;
    let isCurrent = true;
    void reviewEligibility(accessToken, slug).then((answer) => {
      if (isCurrent) setEligibility(answer);
    });
    return () => {
      isCurrent = false;
    };
  }, [accessToken, slug]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (accessToken === null) return;
    const result = await submitReview(accessToken, slug, { rating, comment, locale });
    if (result.data === null) {
      setMessage({ tone: AlertTone.Error, text: tErrors(result.errorCode) });
      return;
    }
    setMessage({ tone: AlertTone.Success, text: t('thanks') });
    setEligibility({ canReview: false, hasReviewed: true });
    setPage((current) =>
      current?.data == null
        ? current
        : {
            data: {
              ...current.data,
              total: current.data.total + 1,
              items: [result.data, ...current.data.items],
            },
            errorCode: null,
          },
    );
  };

  return (
    <section className="product-reviews" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="product-reviews__heading">
        {t('title')}
      </h2>
      {message !== null && (
        <FormAlert tone={message.tone}>
          <p>{message.text}</p>
        </FormAlert>
      )}
      {eligibility?.canReview === true && (
        <form
          className="product-reviews__form stack"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <fieldset className="product-reviews__stars">
            <legend>{t('yourRating')}</legend>
            {STARS.map((value) => (
              <label key={value} className="product-reviews__star">
                <input
                  className="product-reviews__star-input"
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                />
                {t('stars', { count: value })}
              </label>
            ))}
          </fieldset>
          <label className="product-reviews__label">
            {t('comment')}
            <textarea
              className="product-reviews__comment"
              maxLength={1000}
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <Button type="submit">{t('submit')}</Button>
        </form>
      )}
      {page === null ? (
        <p role="status">{t('loading')}</p>
      ) : page.data === null || page.data.items.length === 0 ? (
        <p className="product-reviews__empty">{t('none')}</p>
      ) : (
        <ul className="product-reviews__list">
          {page.data.items.map((review) => (
            <li key={review.id} className="product-reviews__item">
              <p className="product-reviews__meta">
                <span aria-label={t('stars', { count: review.rating })}>
                  {'★'.repeat(review.rating)}
                </span>{' '}
                · {t('verifiedBuyer')} ·{' '}
                {format.dateTime(new Date(review.createdAt), { dateStyle: 'medium' })}
              </p>
              {review.comment !== '' && <p lang={review.locale}>{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
