import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { Link } from '@/i18n/navigation';
import type { CategoryTile } from '@/interfaces/home.interface';
import { pickLocalized } from '@/utils/localized-text.util';

import './CategoryTiles.css';

interface CategoryTilesProps {
  categories: readonly CategoryTile[];
}

/** Round pictures per category, two rows like a marketplace home. */
export const CategoryTiles = async ({ categories }: CategoryTilesProps): Promise<ReactElement> => {
  const [t, locale] = await Promise.all([getTranslations('home'), getLocale()]);
  return (
    <section className="panel" aria-labelledby="home-categories">
      <div className="panel__head">
        <h2 id="home-categories" className="panel__title">
          {t('categoriesTitle')}
        </h2>
      </div>
      <ul className="category-tiles">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link className="category-tiles__link" href={`/c/${category.slug}`}>
              <span className="category-tiles__picture">
                {category.imageUrl === null ? (
                  <Icon name={IconName.Grid} />
                ) : (
                  <Image
                    className="category-tiles__image"
                    src={category.imageUrl}
                    alt=""
                    fill
                    sizes="88px"
                  />
                )}
              </span>
              <span className="category-tiles__name">{pickLocalized(category.name, locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
