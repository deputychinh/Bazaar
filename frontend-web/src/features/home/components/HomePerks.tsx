import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import type { MarketingItem } from '@/interfaces/marketing.interface';

import './HomePerks.css';

const PERK_ICONS = [IconName.Heart, IconName.Coins, IconName.Shield, IconName.Truck] as const;

/** Strip of shopper promises under the banner. */
export const HomePerks = async (): Promise<ReactElement> => {
  const t = await getTranslations('home');
  const perks = t.raw('perks') as MarketingItem[];
  return (
    <ul className="home-perks panel" aria-label={t('perksLabel')}>
      {perks.map((perk, index) => (
        <li key={perk.title} className="home-perks__item">
          <Icon className="home-perks__icon" name={PERK_ICONS[index] ?? IconName.Check} />
          <span className="home-perks__text">
            <strong className="home-perks__title">{perk.title}</strong>
            {perk.text}
          </span>
        </li>
      ))}
    </ul>
  );
};
