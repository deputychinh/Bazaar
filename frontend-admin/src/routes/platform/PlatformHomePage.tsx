import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { BarChart } from '@/components/BarChart/BarChart';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { StatCard } from '@/components/StatCard/StatCard';
import { usePlatformStats } from '@/features/stats/hooks/useStats';
import { formatUsd } from '@/utils/money.util';
import { dailyBars, totalCents, totalOrders } from '@/utils/stats.util';

import './PlatformHomePage.css';

/** Marketplace health over 30 days: GMV, orders by status, best sellers (plan FR-11). */
export const PlatformHomePage = (): ReactElement => {
  const { t, i18n } = useTranslation();
  const stats = usePlatformStats();
  return (
    <main id="main" className="container stack">
      <h1>{t('platform.dashboardTitle')}</h1>
      {stats.isPending ? (
        <p role="status">{t('common.loading')}</p>
      ) : stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <>
          <div className="grid">
            <StatCard
              label={t('dashboard.gmv30')}
              value={formatUsd(totalCents(stats.data.daily), i18n.language)}
            />
            <StatCard
              label={t('dashboard.paidOrders30')}
              value={String(totalOrders(stats.data.daily))}
            />
            {Object.entries(stats.data.byStatus).map(([status, count]) => (
              <StatCard key={status} label={t(`orderStatus.${status}`)} value={String(count)} />
            ))}
          </div>
          <BarChart
            title={t('dashboard.gmvPerDay')}
            bars={dailyBars(stats.data.daily, i18n.language)}
          />
          <section className="stack" aria-labelledby="top-sellers">
            <h2 id="top-sellers">{t('dashboard.topSellers')}</h2>
            <table className="platform-home-page__table">
              <thead>
                <tr>
                  <th className="platform-home-page__cell" scope="col">
                    {t('dashboard.shop')}
                  </th>
                  <th className="platform-home-page__cell" scope="col">
                    {t('dashboard.orders')}
                  </th>
                  <th className="platform-home-page__cell" scope="col">
                    {t('dashboard.sales')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.data.topSellers.map((seller) => (
                  <tr key={seller.sellerId}>
                    <td className="platform-home-page__cell">{seller.shopName}</td>
                    <td className="platform-home-page__cell">{seller.orders}</td>
                    <td className="platform-home-page__cell">
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
