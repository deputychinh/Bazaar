import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { BarChart } from '@/components/BarChart/BarChart';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { StatCard } from '@/components/StatCard/StatCard';
import { ORDER_STATUS_LOOK, STATS_DAYS } from '@/constants/stats.constant';
import { IconName } from '@/enums/icon-name.enum';
import { StatTone } from '@/enums/stat-tone.enum';
import { usePlatformStats } from '@/features/stats/hooks/useStats';
import { formatUsd } from '@/utils/money.util';
import { axisLabels, dailyBars, fillDays, totalCents, totalOrders } from '@/utils/stats.util';

import './PlatformHomePage.css';

/** Marketplace health over 30 days: GMV, orders by status, best sellers (plan FR-11). */
export const PlatformHomePage = (): ReactElement => {
  const { t, i18n } = useTranslation();
  const stats = usePlatformStats();
  const [today] = useState(() => new Date());
  const days = stats.data === undefined ? [] : fillDays(stats.data.daily, STATS_DAYS, today);
  return (
    <main id="main" className="page container">
      <header className="page__head">
        <h1 className="page__title">{t('platform.dashboardTitle')}</h1>
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
              label={t('dashboard.gmv30')}
              value={formatUsd(totalCents(stats.data.daily), i18n.language)}
            />
            <StatCard
              icon={IconName.Receipt}
              tone={StatTone.Info}
              label={t('dashboard.paidOrders30')}
              value={String(totalOrders(stats.data.daily))}
            />
          </div>
          <section className="page__section" aria-labelledby="orders-by-status">
            <h2 id="orders-by-status" className="page__subtitle">
              {t('dashboard.byStatus')}
            </h2>
            <div className="page__stats">
              {Object.entries(stats.data.byStatus).map(([status, count]) => (
                <StatCard
                  key={status}
                  icon={ORDER_STATUS_LOOK[status]?.icon ?? IconName.Package}
                  tone={ORDER_STATUS_LOOK[status]?.tone ?? StatTone.Brand}
                  label={t(`orderStatus.${status}`)}
                  value={String(count)}
                />
              ))}
            </div>
          </section>
          <BarChart
            title={t('dashboard.gmvPerDay')}
            bars={dailyBars(days, i18n.language)}
            formatValue={(cents) => formatUsd(cents, i18n.language)}
            {...axisLabels(days, i18n.language)}
          />
          <section className="panel" aria-labelledby="top-sellers">
            <div className="panel__head">
              <h2 id="top-sellers" className="panel__title">
                {t('dashboard.topSellers')}
              </h2>
            </div>
            <table className="data-table">
              <thead>
                <tr className="data-table__head">
                  <th className="data-table__cell data-table__cell--narrow" scope="col">
                    #
                  </th>
                  <th className="data-table__cell" scope="col">
                    {t('dashboard.shop')}
                  </th>
                  <th className="data-table__cell data-table__cell--number" scope="col">
                    {t('dashboard.orders')}
                  </th>
                  <th className="data-table__cell data-table__cell--number" scope="col">
                    {t('dashboard.sales')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.data.topSellers.map((seller, index) => (
                  <tr key={seller.sellerId} className="data-table__row">
                    <td className="data-table__cell data-table__cell--narrow">
                      <span className="platform-home-page__rank">{index + 1}</span>
                    </td>
                    <td className="data-table__cell">{seller.shopName}</td>
                    <td className="data-table__cell data-table__cell--number">{seller.orders}</td>
                    <td className="data-table__cell data-table__cell--number">
                      {formatUsd(seller.usdCents, i18n.language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
};
