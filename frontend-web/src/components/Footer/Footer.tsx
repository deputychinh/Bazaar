import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { Link } from '@/i18n/navigation';

import './Footer.css';

export const Footer = async (): Promise<ReactElement> => {
  const t = await getTranslations('footer');
  return (
    <footer className="footer">
      <div className="footer__inner container">
        <nav className="footer__links" aria-label={t('label')}>
          <Link className="footer__link" href="/about">
            {t('about')}
          </Link>
          <Link className="footer__link" href="/pricing">
            {t('pricing')}
          </Link>
          <Link className="footer__link" href="/sell">
            {t('sell')}
          </Link>
        </nav>
        <p className="footer__note">{t('note')}</p>
      </div>
    </footer>
  );
};
