import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/interfaces/catalog.interface';

import './HomeBanner.css';

interface HomeBannerProps {
  /** Best sellers shown as a collage on the main banner. */
  showcase: readonly ProductSummary[];
}

const SHOWCASE_COUNT = 3;

/** Main campaign banner with two smaller promos beside it. */
export const HomeBanner = async ({ showcase }: HomeBannerProps): Promise<ReactElement> => {
  const t = await getTranslations('home');
  const pictures = showcase.filter((product) => product.imageUrl !== null).slice(0, SHOWCASE_COUNT);
  return (
    <section className="home-banner">
      <div className="home-banner__main">
        <div className="home-banner__copy">
          <p className="home-banner__kicker">{t('bannerKicker')}</p>
          <h1 className="home-banner__title">{t('heading')}</h1>
          <p className="home-banner__lead">{t('lead')}</p>
          <div className="home-banner__actions">
            <Link className="button button--large home-banner__cta" href="/search">
              {t('shopNow')}
            </Link>
          </div>
        </div>
        {pictures.length > 0 && (
          <ul className="home-banner__collage" aria-hidden="true">
            {pictures.map((product, index) => (
              <li
                key={product.id}
                className={`home-banner__photo home-banner__photo--${index + 1}`}
              >
                <Image
                  className="home-banner__image"
                  src={product.imageUrl ?? ''}
                  alt=""
                  fill
                  sizes="220px"
                  priority={index === 0}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="home-banner__side">
        <Link className="home-banner__promo home-banner__promo--sell" href="/sell">
          <Icon className="home-banner__promo-icon" name={IconName.Store} />
          <span className="home-banner__promo-title">{t('promoSellTitle')}</span>
          <span className="home-banner__promo-text">{t('promoSellText')}</span>
        </Link>
        <Link className="home-banner__promo home-banner__promo--rated" href="/search?sort=rating">
          <Icon className="home-banner__promo-icon" name={IconName.Heart} />
          <span className="home-banner__promo-title">{t('promoRatedTitle')}</span>
          <span className="home-banner__promo-text">{t('promoRatedText')}</span>
        </Link>
      </div>
    </section>
  );
};
