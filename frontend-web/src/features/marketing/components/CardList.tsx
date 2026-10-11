import type { ReactElement } from 'react';

import type { MarketingItem } from '@/interfaces/marketing.interface';
import { cx } from '@/utils/cx.util';

import './CardList.css';

interface CardListProps {
  title: string;
  items: readonly MarketingItem[];
  /** Numbered steps instead of plain cards. */
  isNumbered?: boolean;
}

/** A titled section of short cards: value props, how-it-works steps, plans. */
export const CardList = ({ title, items, isNumbered = false }: CardListProps): ReactElement => {
  const List = isNumbered ? 'ol' : 'ul';
  return (
    <section className="card-list section">
      <div className="container stack">
        <h2 className="card-list__title">{title}</h2>
        <List className={cx('card-list__items', isNumbered && 'card-list__items--numbered')}>
          {items.map((item) => (
            <li key={item.title} className="card-list__item">
              <h3 className="card-list__item-title">{item.title}</h3>
              <p className="card-list__item-text">{item.text}</p>
            </li>
          ))}
        </List>
      </div>
    </section>
  );
};
