import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { Link } from '@/i18n/navigation';

import './Footer.css';

/** Link columns like a real marketplace footer, then the legal line. */
export const Footer = async (): Promise<ReactElement> => {
  const t = await getTranslations('footer');
  return (
    <footer className="footer">
      <div className="footer__columns container">
        <nav className="footer__column" aria-labelledby="footer-customer">
          <h2 id="footer-customer" className="footer__title">
            {t('customerTitle')}
          </h2>
          <Link className="footer__link" href="/orders">
            {t('orders')}
          </Link>
          <Link className="footer__link" href="/cart">
            {t('cart')}
          </Link>
          <Link className="footer__link" href="/account">
            {t('account')}
          </Link>
        </nav>
        <nav className="footer__column" aria-labelledby="footer-about">
          <h2 id="footer-about" className="footer__title">
            {t('aboutTitle')}
          </h2>
          <Link className="footer__link" href="/about">
            {t('about')}
          </Link>
          <Link className="footer__link" href="/pricing">
            {t('pricing')}
          </Link>
        </nav>
        <nav className="footer__column" aria-labelledby="footer-sell">
          <h2 id="footer-sell" className="footer__title">
            {t('sellTitle')}
          </h2>
          <Link className="footer__link" href="/sell">
            {t('sell')}
          </Link>
          <Link className="footer__link" href="/register">
            {t('openShop')}
          </Link>
        </nav>
        <div className="footer__column">
          <h2 className="footer__title">{t('paymentTitle')}</h2>
          <p className="footer__badges">
            <span className="footer__card">VISA</span>
            <span className="footer__card">Mastercard</span>
          </p>
          <p className="footer__text">
            <Icon name={IconName.Card} />
            {t('paymentText')}
          </p>
        </div>
        <div className="footer__column">
          <h2 className="footer__title">{t('deliveryTitle')}</h2>
          <p className="footer__text">
            <Icon name={IconName.Truck} />
            {t('deliveryText')}
          </p>
        </div>
      </div>
      <div className="footer__bottom container">
        <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        <p>{t('region')}</p>
        <p className="footer__note">{t('note')}</p>
      </div>
    </footer>
  );
};
