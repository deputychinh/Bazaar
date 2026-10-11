import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Link } from '@/i18n/navigation';
import type { Category } from '@/interfaces/catalog.interface';
import { cx } from '@/utils/cx.util';
import { pickLocalized } from '@/utils/localized-text.util';

import './CategoryNav.css';

interface CategoryNavProps {
  categories: readonly Category[];
  currentSlug?: string;
}

export const CategoryNav = ({ categories, currentSlug }: CategoryNavProps): ReactElement => {
  const t = useTranslations('catalog');
  const locale = useLocale();
  const renderList = (items: readonly Category[]): ReactElement => (
    <ul className="category-nav__list">
      {items.map((category) => (
        <li key={category.id}>
          <Link
            className={cx(
              'category-nav__link',
              category.slug === currentSlug && 'category-nav__link--current',
            )}
            href={`/c/${category.slug}`}
            aria-current={category.slug === currentSlug ? 'page' : undefined}
          >
            {pickLocalized(category.name, locale)}
          </Link>
          {category.children.length > 0 && renderList(category.children)}
        </li>
      ))}
    </ul>
  );
  return (
    <nav className="category-nav" aria-label={t('categories')}>
      {renderList(categories)}
    </nav>
  );
};
