import type { ReactElement } from 'react';

import { MAX_RATING } from '@/constants/catalog.constant';
import { cx } from '@/utils/cx.util';

import './StarRating.css';

interface StarRatingProps {
  average: number;
  /** Read by screen readers instead of the stars, e.g. "Rated 4.6 out of 5 by 12 buyers". */
  label: string;
  isLarge?: boolean;
}

/** Five stars filled to the average (partial stars included). */
export const StarRating = ({ average, label, isLarge = false }: StarRatingProps): ReactElement => {
  const stars = '★'.repeat(MAX_RATING);
  return (
    <span
      className={cx('star-rating', isLarge && 'star-rating--large')}
      role="img"
      aria-label={label}
    >
      <span className="star-rating__track" aria-hidden="true">
        {stars}
      </span>
      <span
        className="star-rating__fill"
        style={{ inlineSize: `${(Math.min(average, MAX_RATING) / MAX_RATING) * 100}%` }}
        aria-hidden="true"
      >
        {stars}
      </span>
    </span>
  );
};
