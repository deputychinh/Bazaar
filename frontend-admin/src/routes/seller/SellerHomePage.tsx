import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { BarChart } from '@/components/BarChart/BarChart';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { StatCard } from '@/components/StatCard/StatCard';
import { STATS_DAYS } from '@/constants/stats.constant';
import { IconName } from '@/enums/icon-name.enum';
import { StatTone } from '@/enums/stat-tone.enum';
import { useSellerStats } from '@/features/stats/hooks/useStats';
import { formatUsd } from '@/utils/money.util';
import { axisLabels, dailyBars, fillDays, totalCents, totalOrders } from '@/utils/stats.util';

/** The seller's last 30 days: sales, orders, what waits to be shipped (plan FR-11). */
export const SellerHomePage = (): ReactElement => {
  const { t, i18n } = useTranslation();
  const stats = useSellerStats();
  const [today] = useState(() => new Date());
  const days = stats.data === undefined ? [] : fillDays(stats.data.daily, STATS_DAYS, today);
  return (
    <main id="main" className="page container">
      <header className="page__head">
        <h1 className="page__title">{t('seller.dashboardTitle')}</h1>
        <p className="page__lead">{t('dashboard.last30')}</p>
      </header>
      {stats.isPending ? (
        <p role="status">{t('common.loading')}</p>
      ) : stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <>
          <div className="page__stats">
            <StatCard
              icon={IconName.Coins}
              label={t('dashboard.sales30')}
              value={formatUsd(totalCents(stats.data.daily), i18n.language)}
            />
            <StatCard
              icon={IconName.Receipt}
              tone={StatTone.Info}
              label={t('dashboard.orders30')}
              value={String(totalOrders(stats.data.daily))}
            />
            <StatCard
              icon={IconName.Truck}
              tone={stats.data.toShip > 0 ? StatTone.Warning : StatTone.Success}
              label={t('dashboard.toShip')}
              value={String(stats.data.toShip)}
            />
          </div>
          {stats.data.toShip > 0 && (
            <div className="page__notice">
              <Icon name={IconName.Clock} />
              <span>{t('dashboard.toShipNotice', { count: stats.data.toShip })}</span>
              <Link className="button button--primary button--small" to="/seller/orders">
                {t('dashboard.goShip')}
              </Link>
            </div>
          )}
          <BarChart
            title={t('dashboard.salesPerDay')}
            bars={dailyBars(days, i18n.language)}
            formatValue={(cents) => formatUsd(cents, i18n.language)}
            {...axisLabels(days, i18n.language)}
          />
        </>
      )}
    </main>
  );
};
